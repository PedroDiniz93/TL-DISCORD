require("dotenv").config();

const {
  ARCH_GAIN_HISTORY_SHEET,
  ARCH_SHEET,
  RARE_ITEM_GAIN_HISTORY_SHEET,
  RARE_ITEM_SHEET,
} = require("../src/config");
const { closePool, query, transaction } = require("../src/db");
const { getSheetRows } = require("../src/sheets");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

async function main() {
  validateEnv();

  const guild = await ensureGuild();
  const [archRows, rareRows, archHistoryRows, rareHistoryRows] = await Promise.all([
    getSheetRows(ARCH_SHEET.title, ARCH_SHEET.headers),
    getSheetRows(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers),
    getSheetRows(ARCH_GAIN_HISTORY_SHEET.title, ARCH_GAIN_HISTORY_SHEET.headers),
    getSheetRows(RARE_ITEM_GAIN_HISTORY_SHEET.title, RARE_ITEM_GAIN_HISTORY_SHEET.headers),
  ]);

  const activeRecords = [
    ...archRows.map((row) => buildWishlistRecord("arch", row, "Arma")),
    ...rareRows.map((row) => buildWishlistRecord("rare", row, "Item")),
  ].filter(isImportableWishlistRecord);

  const deliveryRecords = [
    ...archHistoryRows.map((row) => buildDeliveryRecord("arch", row)),
    ...rareHistoryRows.map((row) => buildDeliveryRecord("rare", row)),
  ].filter(isImportableDeliveryRecord);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          guildId: guild.discord_guild_id,
          activeWishlistRows: activeRecords.length,
          deliveryRows: deliveryRecords.length,
        },
        null,
        2
      )
    );
    return;
  }

  const result = await transaction(async (client) => {
    const active = await importWishlistRecords(client, guild.id, activeRecords);
    const deliveries = await importDeliveryRecords(client, guild.id, deliveryRecords);
    return { active, deliveries };
  });

  console.log(
    JSON.stringify(
      {
        guildId: guild.discord_guild_id,
        wishlistInserted: result.active.inserted,
        wishlistSkipped: result.active.skipped,
        deliveriesInserted: result.deliveries.inserted,
        deliveriesSkipped: result.deliveries.skipped,
      },
      null,
      2
    )
  );
}

function validateEnv() {
  const required = [
    "DATABASE_URL",
    "GUILD_ID",
    "SHEET_ID",
    "GOOGLE_CREDS_B64",
  ];
  const missing = required.filter((name) => !String(process.env[name] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function ensureGuild() {
  const discordGuildId = String(process.env.GUILD_ID || "").trim();
  const name = String(process.env.IMPORT_GUILD_NAME || "").trim();
  const result = await query(
    `INSERT INTO guilds (discord_guild_id, name)
     VALUES ($1, $2)
     ON CONFLICT (discord_guild_id)
     DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), guilds.name),
                   updated_at = now()
     RETURNING id, discord_guild_id`,
    [discordGuildId, name]
  );
  return result.rows[0];
}

function buildWishlistRecord(type, row, itemColumn) {
  return {
    type,
    registeredAt: clean(row.Data),
    nickname: clean(row.Nick),
    itemName: clean(row[itemColumn]),
    discordUserId: clean(row.DiscordUserId),
  };
}

function buildDeliveryRecord(type, row) {
  return {
    type,
    deliveredAt: clean(row["Data/Hora"]),
    playerName: clean(row.Player),
    itemName: clean(row.Item),
    discordUserId: clean(row.DiscordUserId),
  };
}

function isImportableWishlistRecord(record) {
  return Boolean(
    record.type &&
      record.registeredAt &&
      record.nickname &&
      record.itemName &&
      record.discordUserId
  );
}

function isImportableDeliveryRecord(record) {
  return Boolean(
    record.type &&
      record.deliveredAt &&
      record.playerName &&
      record.itemName
  );
}

async function importWishlistRecords(client, guildId, records) {
  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const exists = await client.query(
      `SELECT id
         FROM wishlist_entries
        WHERE guild_id = $1
          AND type = $2
          AND item_name = $3
          AND nickname = $4
          AND discord_user_id = $5
          AND registered_at_text = $6
          AND deleted_at IS NULL
        LIMIT 1`,
      [
        guildId,
        record.type,
        record.itemName,
        record.nickname,
        record.discordUserId,
        record.registeredAt,
      ]
    );

    if (exists.rowCount) {
      skipped++;
      continue;
    }

    const player = await upsertPlayer(client, {
      guildId,
      discordUserId: record.discordUserId,
      nickname: record.nickname,
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
      [
        guildId,
        player.id,
        record.type,
        record.itemName,
        record.nickname,
        record.discordUserId,
        record.registeredAt,
      ]
    );
    inserted++;
  }

  return { inserted, skipped };
}

async function importDeliveryRecords(client, guildId, records) {
  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const exists = await client.query(
      `SELECT id
         FROM deliveries
        WHERE guild_id = $1
          AND type = $2
          AND item_name = $3
          AND player_name = $4
          AND discord_user_id = $5
          AND delivered_at_text = $6
        LIMIT 1`,
      [
        guildId,
        record.type,
        record.itemName,
        record.playerName,
        record.discordUserId,
        record.deliveredAt,
      ]
    );

    if (exists.rowCount) {
      skipped++;
      continue;
    }

    await client.query(
      `INSERT INTO deliveries (
         guild_id,
         type,
         item_name,
         player_name,
         discord_user_id,
         delivered_at_text
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        guildId,
        record.type,
        record.itemName,
        record.playerName,
        record.discordUserId,
        record.deliveredAt,
      ]
    );
    inserted++;
  }

  return { inserted, skipped };
}

async function upsertPlayer(client, { guildId, discordUserId, nickname }) {
  const result = await client.query(
    `INSERT INTO players (guild_id, discord_user_id, nickname)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, discord_user_id)
     DO UPDATE SET nickname = EXCLUDED.nickname,
                   updated_at = now()
     RETURNING id`,
    [guildId, discordUserId, nickname]
  );
  return result.rows[0];
}

function clean(value) {
  return String(value || "").trim();
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
