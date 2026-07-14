const { ensureGuild } = require("./guild-settings");
const { query, transaction } = require("./db");
const {
  rareItems,
  weapons,
  isRareArmor,
  isSkillCore,
  isWorldBossEquipT4,
  isWorldBossJewelryT4,
  isWorldBossWeaponT4,
  stripLeadingItemEmoji,
} = require("./items");

const DEFAULT_CATEGORIES = [
  { type: "arch", key: "arch_weapon", name: "Armas Archboss", limitPerUser: 1, sortOrder: 10 },
  { type: "rare", key: "armor", name: "Armadura", limitPerUser: 1, sortOrder: 20 },
  { type: "rare", key: "accessory", name: "Joia/Acessorio", limitPerUser: 3, sortOrder: 30 },
  { type: "rare", key: "skill_core", name: "Nucleo", limitPerUser: 1, sortOrder: 40 },
  { type: "rare", key: "world_boss_weapon_t4", name: "Arma Boss Mundo T4", limitPerUser: 1, sortOrder: 50 },
  { type: "rare", key: "world_boss_equip_t4", name: "Equipamento Boss Mundo T4", limitPerUser: 1, sortOrder: 60 },
  { type: "rare", key: "world_boss_jewelry_t4", name: "Joia Boss Mundo T4", limitPerUser: 3, sortOrder: 70 },
];

async function ensureDefaultCatalog(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);

  await transaction(async (client) => {
    const count = await client.query(
      "SELECT COUNT(*)::int AS total FROM item_categories WHERE guild_id = $1",
      [guild.id]
    );
    if (count.rows[0]?.total > 0) return;

    const categoryIds = new Map();
    for (const category of DEFAULT_CATEGORIES) {
      const result = await client.query(
        `INSERT INTO item_categories (guild_id, type, key, name, limit_per_user, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          guild.id,
          category.type,
          category.key,
          category.name,
          category.limitPerUser,
          category.sortOrder,
        ]
      );
      categoryIds.set(category.key, result.rows[0].id);
    }

    for (const [index, item] of weapons.entries()) {
      await insertItem(client, guild.id, {
        type: "arch",
        categoryId: categoryIds.get("arch_weapon"),
        name: item,
        sortOrder: index + 1,
      });
    }

    for (const [index, item] of rareItems.entries()) {
      const key = inferRareCategoryKey(item);
      await insertItem(client, guild.id, {
        type: "rare",
        categoryId: categoryIds.get(key),
        name: stripLeadingItemEmoji(item),
        sortOrder: index + 1,
      });
    }
  });
}

async function getCatalog(discordGuildId) {
  await ensureDefaultCatalog(discordGuildId);
  const guild = await ensureGuild(discordGuildId);
  const [categories, items] = await Promise.all([
    query(
      `SELECT id, type, key, name, limit_per_user, sort_order, active
         FROM item_categories
        WHERE guild_id = $1
        ORDER BY type ASC, sort_order ASC, name ASC`,
      [guild.id]
    ),
    query(
      `SELECT
         gi.id,
         gi.category_id,
         gi.type,
         gi.name,
         gi.name_pt,
         gi.name_en,
         gi.aliases,
         gi.image_url,
         gi.active,
         gi.sort_order,
         ic.key AS category_key,
         ic.name AS category_name,
         ic.limit_per_user
       FROM guild_items gi
       LEFT JOIN item_categories ic ON ic.id = gi.category_id
      WHERE gi.guild_id = $1
      ORDER BY gi.type ASC, gi.sort_order ASC, gi.name ASC`,
      [guild.id]
    ),
  ]);

  return {
    categories: categories.rows.map(mapCategory),
    items: items.rows.map(mapItem),
  };
}

async function getActiveItemsByType(discordGuildId, type) {
  const catalog = await getCatalog(discordGuildId);
  return catalog.items.filter((item) => item.type === type && item.active);
}

async function findItemByName(discordGuildId, type, name) {
  const target = normalizeItemName(name);
  const items = await getActiveItemsByType(discordGuildId, type);
  return items.find((item) => {
    const names = [item.name, item.namePt, item.nameEn, ...item.aliases];
    return names.some((candidate) => normalizeItemName(candidate) === target);
  }) || null;
}

async function saveCategory(discordGuildId, payload) {
  const guild = await ensureGuild(discordGuildId);
  const id = Number(payload.id || 0);
  const values = [
    guild.id,
    String(payload.type || "rare"),
    slugify(payload.key || payload.name),
    String(payload.name || "").trim(),
    Number.parseInt(payload.limitPerUser, 10) || 0,
    Number.parseInt(payload.sortOrder, 10) || 0,
    Boolean(payload.active),
  ];

  if (id) {
    await query(
      `UPDATE item_categories
          SET type = $2, key = $3, name = $4, limit_per_user = $5, sort_order = $6,
              active = $7, updated_at = now()
        WHERE guild_id = $1 AND id = $8`,
      [...values, id]
    );
    return;
  }

  await query(
    `INSERT INTO item_categories (guild_id, type, key, name, limit_per_user, sort_order, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (guild_id, key)
     DO UPDATE SET type = EXCLUDED.type,
                   name = EXCLUDED.name,
                   limit_per_user = EXCLUDED.limit_per_user,
                   sort_order = EXCLUDED.sort_order,
                   active = EXCLUDED.active,
                   updated_at = now()`,
    values
  );
}

async function saveItem(discordGuildId, payload) {
  const guild = await ensureGuild(discordGuildId);
  const id = Number(payload.id || 0);
  const aliases = parseAliases(payload.aliases);
  const values = [
    guild.id,
    Number(payload.categoryId || 0) || null,
    String(payload.type || "rare"),
    String(payload.name || "").trim(),
    String(payload.namePt || "").trim(),
    String(payload.nameEn || "").trim(),
    aliases,
    String(payload.imageUrl || "").trim(),
    Boolean(payload.active),
    Number.parseInt(payload.sortOrder, 10) || 0,
  ];

  if (id) {
    await query(
      `UPDATE guild_items
          SET category_id = $2, type = $3, name = $4, name_pt = $5, name_en = $6,
              aliases = $7, image_url = $8, active = $9, sort_order = $10,
              updated_at = now()
        WHERE guild_id = $1 AND id = $11`,
      [...values, id]
    );
    return;
  }

  await query(
    `INSERT INTO guild_items (
       guild_id, category_id, type, name, name_pt, name_en, aliases, image_url, active, sort_order
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (guild_id, type, name)
     DO UPDATE SET category_id = EXCLUDED.category_id,
                   name_pt = EXCLUDED.name_pt,
                   name_en = EXCLUDED.name_en,
                   aliases = EXCLUDED.aliases,
                   image_url = EXCLUDED.image_url,
                   active = EXCLUDED.active,
                   sort_order = EXCLUDED.sort_order,
                   updated_at = now()`,
    values
  );
}

async function deleteCategory(discordGuildId, id) {
  const guild = await ensureGuild(discordGuildId);
  await query("DELETE FROM item_categories WHERE guild_id = $1 AND id = $2", [guild.id, id]);
}

async function deleteItem(discordGuildId, id) {
  const guild = await ensureGuild(discordGuildId);
  await query("DELETE FROM guild_items WHERE guild_id = $1 AND id = $2", [guild.id, id]);
}

function getItemCategoryKey(item) {
  return item?.categoryKey || inferRareCategoryKey(item?.name || item);
}

function inferRareCategoryKey(item) {
  if (isSkillCore(item)) return "skill_core";
  if (isWorldBossWeaponT4(item)) return "world_boss_weapon_t4";
  if (isWorldBossEquipT4(item)) return "world_boss_equip_t4";
  if (isWorldBossJewelryT4(item)) return "world_boss_jewelry_t4";
  if (isRareArmor(item)) return "armor";
  return "accessory";
}

function mapCategory(row) {
  return {
    id: row.id,
    type: row.type,
    key: row.key,
    name: row.name,
    limitPerUser: Number(row.limit_per_user || 0),
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
  };
}

function mapItem(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    type: row.type,
    name: row.name,
    namePt: row.name_pt,
    nameEn: row.name_en,
    aliases: row.aliases || [],
    imageUrl: row.image_url,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
    categoryKey: row.category_key || "",
    categoryName: row.category_name || "",
    limitPerUser: Number(row.limit_per_user || 1),
  };
}

async function insertItem(client, guildId, item) {
  await client.query(
    `INSERT INTO guild_items (guild_id, category_id, type, name, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, type, name) DO NOTHING`,
    [guildId, item.categoryId, item.type, item.name, item.sortOrder]
  );
}

function parseAliases(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeItemName(value) {
  return stripLeadingItemEmoji(value).toLowerCase();
}

function slugify(value) {
  return String(value || "categoria")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "categoria";
}

module.exports = {
  deleteCategory,
  deleteItem,
  ensureDefaultCatalog,
  findItemByName,
  getActiveItemsByType,
  getCatalog,
  getItemCategoryKey,
  saveCategory,
  saveItem,
};
