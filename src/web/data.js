const { ensureGuild, getSubscription } = require("../guild-settings");
const { query } = require("../db");

async function getPanelData(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);
  const [queues, deliveries, subscription, counts] = await Promise.all([
    getQueueSummary(guild.id),
    getRecentDeliveries(guild.id),
    getSubscription(discordGuildId),
    getCounts(guild.id),
  ]);

  return {
    queues,
    deliveries,
    subscription,
    counts,
  };
}

async function getQueueSummary(guildId) {
  const result = await query(
    `SELECT type, item_name, COUNT(*)::int AS total, MIN(created_at) AS first_created_at
       FROM wishlist_entries
      WHERE guild_id = $1
        AND deleted_at IS NULL
      GROUP BY type, item_name
      ORDER BY type ASC, total DESC, item_name ASC`,
    [guildId]
  );
  return result.rows;
}

async function getRecentDeliveries(guildId) {
  const result = await query(
    `SELECT type, item_name, player_name, discord_user_id, delivered_at_text, created_at
       FROM deliveries
      WHERE guild_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 50`,
    [guildId]
  );
  return result.rows;
}

async function getCounts(guildId) {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'arch')::int AS arch_count,
       COUNT(*) FILTER (WHERE type = 'rare')::int AS rare_count,
       COUNT(DISTINCT discord_user_id)::int AS player_count
     FROM wishlist_entries
     WHERE guild_id = $1
       AND deleted_at IS NULL`,
    [guildId]
  );
  return result.rows[0] || { arch_count: 0, rare_count: 0, player_count: 0 };
}

async function getWishlistExportRows(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);
  const result = await query(
    `SELECT type, registered_at_text, nickname, item_name, discord_user_id
       FROM wishlist_entries
      WHERE guild_id = $1
        AND deleted_at IS NULL
      ORDER BY type ASC, created_at ASC, id ASC`,
    [guild.id]
  );
  return result.rows;
}

async function getDeliveryExportRows(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);
  const result = await query(
    `SELECT type, delivered_at_text, player_name, item_name, discord_user_id
       FROM deliveries
      WHERE guild_id = $1
      ORDER BY created_at ASC, id ASC`,
    [guild.id]
  );
  return result.rows;
}

function rowsToCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] || "")).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = {
  getDeliveryExportRows,
  getPanelData,
  getWishlistExportRows,
  rowsToCsv,
};
