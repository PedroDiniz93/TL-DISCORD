const { query, transaction } = require("./db");
const { getCurrentGuildId, getCurrentUserId } = require("./interaction-context");
const { normalizeQueueItemName, parseBrazilianDateTime } = require("./utils");

const WISHLIST_CONFIG_BY_TYPE = {
  arch: {
    itemColumn: "Arma",
  },
  rare: {
    itemColumn: "Item",
  },
};

function getWishlistConfig(type) {
  const config = WISHLIST_CONFIG_BY_TYPE[type];
  if (!config) throw new Error(`Unsupported wishlist type: ${type}`);
  return config;
}

async function getArchRows() {
  return getRowsByType("arch");
}

async function getRareItemRows() {
  return getRowsByType("rare");
}

async function getArchHistoryRows() {
  return getDeliveryHistoryRows("arch");
}

async function getRareItemHistoryRows() {
  return getDeliveryHistoryRows("rare");
}

async function getRowsByType(type) {
  const guild = await ensureCurrentGuild();
  const result = await query(
    `SELECT *
       FROM wishlist_entries
      WHERE guild_id = $1
        AND type = $2
        AND deleted_at IS NULL
      ORDER BY created_at ASC, id ASC`,
    [guild.id, type]
  );
  return result.rows.map(rowToWishlistRecord);
}

async function getFreshRowsByType(type) {
  return getRowsByType(type);
}

async function getUserArchRows(discordUserId) {
  return filterRowsByDiscordUserId(await getArchRows(), discordUserId);
}

async function getUserRareItemRows(discordUserId) {
  return filterRowsByDiscordUserId(await getRareItemRows(), discordUserId);
}

async function getUserWishlistRows(discordUserId) {
  const [archRows, rareItemRows] = await Promise.all([
    getUserArchRows(discordUserId),
    getUserRareItemRows(discordUserId),
  ]);

  return {
    archRows,
    rareItemRows,
  };
}

async function getQueueRows(type, item) {
  const config = getWishlistConfig(type);
  const rows = await getRowsByType(type);
  const targetItem = normalizeQueueItemName(item);

  return rows
    .filter((row) => normalizeQueueItemName(row[config.itemColumn]) === targetItem)
    .map((row) => ({
      row,
      parsedDate: parseBrazilianDateTime(row.Data) || new Date(0),
    }))
    .sort(compareQueueEntries);
}

async function addArchRegistration({ registeredAt, nick, weapon, discordUserId }) {
  await addActiveRowByType("arch", {
    registeredAt,
    nick,
    item: weapon,
    discordUserId,
  });
}

async function addRareItemRegistration({ registeredAt, nick, item, discordUserId }) {
  await addActiveRowByType("rare", {
    registeredAt,
    nick,
    item,
    discordUserId,
  });
}

async function addActiveRowByType(type, { registeredAt, nick, item, discordUserId }) {
  const guild = await ensureCurrentGuild();
  await transaction(async (client) => {
    const player = await upsertPlayer(client, {
      guildId: guild.id,
      discordUserId,
      nick,
    });

    await client.query(
      `INSERT INTO wishlist_entries (
         guild_id,
         player_id,
         type,
         item_name,
         nickname,
         discord_user_id,
         registered_at_text
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [guild.id, player.id, type, item, nick, discordUserId, registeredAt]
    );
  });
}

async function deleteArchRow(row) {
  await softDeleteWishlistRow(row);
}

async function deleteRareItemRow(row) {
  await softDeleteWishlistRow(row);
}

async function addDeliveryHistory({ type, deliveredAt, player, item, discordUserId }) {
  const guild = await ensureCurrentGuild();
  await query(
    `INSERT INTO deliveries (
       guild_id,
       type,
       item_name,
       player_name,
       discord_user_id,
       delivered_at_text,
       delivered_by_discord_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [guild.id, type, item, player, discordUserId, deliveredAt, getCurrentUserId()]
  );
}

async function deleteActiveRowByType(type, row) {
  const config = getWishlistConfig(type);
  if (!row?.id) {
    throw new Error(`Cannot delete ${type} wishlist row without id.`);
  }
  if (!row[config.itemColumn]) {
    throw new Error(`Cannot delete ${type} wishlist row without ${config.itemColumn}.`);
  }
  await softDeleteWishlistRow(row);
}

async function getDeliveryHistoryRows(type) {
  const guild = await ensureCurrentGuild();
  const result = await query(
    `SELECT *
       FROM deliveries
      WHERE guild_id = $1
        AND type = $2
      ORDER BY created_at ASC, id ASC`,
    [guild.id, type]
  );
  return result.rows.map(rowToDeliveryRecord);
}

async function softDeleteWishlistRow(row) {
  const guild = await ensureCurrentGuild();
  if (!row?.id) throw new Error("Cannot delete wishlist row without id.");

  await query(
    `UPDATE wishlist_entries
        SET deleted_at = now(),
            deleted_by_discord_user_id = $3
      WHERE guild_id = $1
        AND id = $2
        AND deleted_at IS NULL`,
    [guild.id, row.id, getCurrentUserId()]
  );
}

async function ensureCurrentGuild() {
  const discordGuildId = getCurrentGuildId();
  if (!discordGuildId) {
    throw new Error("Missing guild context for PostgreSQL wishlist storage.");
  }

  const result = await query(
    `INSERT INTO guilds (discord_guild_id)
     VALUES ($1)
     ON CONFLICT (discord_guild_id)
     DO UPDATE SET updated_at = now()
     RETURNING id, discord_guild_id`,
    [discordGuildId]
  );
  return result.rows[0];
}

async function upsertPlayer(client, { guildId, discordUserId, nick }) {
  const result = await client.query(
    `INSERT INTO players (guild_id, discord_user_id, nickname)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, discord_user_id)
     DO UPDATE SET nickname = EXCLUDED.nickname,
                   updated_at = now()
     RETURNING id`,
    [guildId, discordUserId, nick]
  );
  return result.rows[0];
}

function rowToWishlistRecord(row) {
  const config = getWishlistConfig(row.type);
  return {
    id: row.id,
    rowNumber: Number(row.id) || 0,
    Data: row.registered_at_text,
    Nick: row.nickname,
    [config.itemColumn]: row.item_name,
    DiscordUserId: row.discord_user_id,
  };
}

function rowToDeliveryRecord(row) {
  return {
    id: row.id,
    rowNumber: Number(row.id) || 0,
    "Data/Hora": row.delivered_at_text,
    Player: row.player_name,
    Item: row.item_name,
    DiscordUserId: row.discord_user_id,
  };
}

function filterRowsByDiscordUserId(rows, discordUserId) {
  const userId = String(discordUserId || "").trim();
  return rows.filter((row) => String(row.DiscordUserId || "").trim() === userId);
}

function compareQueueEntries(a, b) {
  if (a.parsedDate.getTime() !== b.parsedDate.getTime()) {
    return a.parsedDate.getTime() - b.parsedDate.getTime();
  }
  return (a.row.rowNumber || 0) - (b.row.rowNumber || 0);
}

module.exports = {
  addActiveRowByType,
  addArchRegistration,
  addDeliveryHistory,
  addRareItemRegistration,
  deleteActiveRowByType,
  deleteArchRow,
  deleteRareItemRow,
  getArchRows,
  getArchHistoryRows,
  getFreshRowsByType,
  getQueueRows,
  getRareItemRows,
  getRareItemHistoryRows,
  getRowsByType,
  getUserArchRows,
  getUserRareItemRows,
  getUserWishlistRows,
  getWishlistConfig,
};
