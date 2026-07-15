import { query } from "@/lib/db";
import { getCatalogItemImageUrl } from "@/lib/item-images";

export type Category = {
  id: number;
  type: "arch" | "rare";
  key: string;
  name: string;
  limitPerUser: number;
  sortOrder: number;
  active: boolean;
};

export type GuildItem = {
  id: number;
  categoryId: number | null;
  categoryName: string;
  type: "arch" | "rare";
  name: string;
  namePt: string;
  nameEn: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
};

export type QueuePlayer = {
  id: number;
  nickname: string;
  discordUserId: string;
  registeredAtText: string;
  createdAt: string;
};

export type QueueGroup = {
  type: string;
  item_name: string;
  total: number;
  imageUrl: string;
  players: QueuePlayer[];
};

export async function ensureGuild(discordGuildId: string, name = "") {
  const result = await query<{ id: number; discord_guild_id: string; name: string }>(
    `INSERT INTO guilds (discord_guild_id, name)
     VALUES ($1, $2)
     ON CONFLICT (discord_guild_id)
     DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), guilds.name),
                   updated_at = now()
     RETURNING id, discord_guild_id, name`,
    [discordGuildId, name]
  );
  await query(
    `INSERT INTO guild_settings (guild_id, allowed_channel_id, admin_role_id, locale, rules)
     VALUES ($1, '', '', 'pt-BR', '{}'::jsonb)
     ON CONFLICT (guild_id) DO NOTHING`,
    [result.rows[0].id]
  );
  return result.rows[0];
}

export async function getGuildSettings(discordGuildId: string) {
  const guild = await ensureGuild(discordGuildId);
  const result = await query<{
    allowed_channel_id: string;
    admin_role_id: string;
    locale: string;
    rules: { adminRoleIds?: string[] };
  }>(
    `SELECT allowed_channel_id, admin_role_id, locale, rules
     FROM guild_settings WHERE guild_id = $1`,
    [guild.id]
  );
  const row = result.rows[0];
  return {
    allowedChannelId: row?.allowed_channel_id || "",
    adminRoleIds: row?.rules?.adminRoleIds?.length ? row.rules.adminRoleIds : row?.admin_role_id ? [row.admin_role_id] : [],
    locale: row?.locale || "pt-BR",
  };
}

export async function getCatalog(discordGuildId: string) {
  const guild = await ensureGuild(discordGuildId);
  const [categories, items] = await Promise.all([
    query<CategoryRow>(
      `SELECT id, type, key, name, limit_per_user, sort_order, active
       FROM item_categories WHERE guild_id = $1
       ORDER BY type ASC, sort_order ASC, name ASC`,
      [guild.id]
    ),
    query<ItemRow>(
      `SELECT gi.id, gi.category_id, gi.type, gi.name, gi.name_pt, gi.name_en,
              gi.image_url, gi.active, gi.sort_order, ic.name AS category_name
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

export async function getPanelData(discordGuildId: string) {
  const guild = await ensureGuild(discordGuildId);
  const [counts, queues, deliveries, subscription] = await Promise.all([
    query<{ arch_count: number; rare_count: number; player_count: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE type = 'arch')::int AS arch_count,
         COUNT(*) FILTER (WHERE type = 'rare')::int AS rare_count,
         COUNT(DISTINCT discord_user_id)::int AS player_count
       FROM wishlist_entries WHERE guild_id = $1 AND deleted_at IS NULL`,
      [guild.id]
    ),
    query<QueueEntryRow>(
      `SELECT id, type, item_name, nickname, discord_user_id, registered_at_text, created_at
       FROM wishlist_entries
       WHERE guild_id = $1 AND deleted_at IS NULL
       ORDER BY type ASC, lower(item_name) ASC, created_at ASC, id ASC`,
      [guild.id]
    ),
    query<{ type: string; item_name: string; player_name: string; delivered_at_text: string }>(
      `SELECT type, item_name, player_name, delivered_at_text
       FROM deliveries
       WHERE guild_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [guild.id]
    ),
    query<{ plan: string; status: string; current_period_ends_at: Date | null }>(
      `SELECT plan, status, current_period_ends_at
       FROM subscriptions
       WHERE guild_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [guild.id]
    ),
  ]);
  return {
    counts: counts.rows[0] || { arch_count: 0, rare_count: 0, player_count: 0 },
    queues: mapQueues(queues.rows),
    deliveries: deliveries.rows,
    subscription: subscription.rows[0] || { plan: "free", status: "trial", current_period_ends_at: null },
  };
}

type CategoryRow = {
  id: number;
  type: "arch" | "rare";
  key: string;
  name: string;
  limit_per_user: number;
  sort_order: number;
  active: boolean;
};

type ItemRow = {
  id: number;
  category_id: number | null;
  category_name: string | null;
  type: "arch" | "rare";
  name: string;
  name_pt: string;
  name_en: string;
  image_url: string;
  active: boolean;
  sort_order: number;
};

type QueueEntryRow = {
  id: number;
  type: string;
  item_name: string;
  nickname: string;
  discord_user_id: string;
  registered_at_text: string;
  created_at: Date;
};

function mapCategory(row: CategoryRow): Category {
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

function mapItem(row: ItemRow): GuildItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name || "",
    type: row.type,
    name: row.name,
    namePt: row.name_pt,
    nameEn: row.name_en,
    imageUrl: getCatalogItemImageUrl(row.name, row.image_url, [row.name_pt, row.name_en]),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapQueues(rows: QueueEntryRow[]): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  for (const row of rows) {
    const key = `${row.type}:${row.item_name.toLowerCase()}`;
    const group = groups.get(key) || {
      type: row.type,
      item_name: row.item_name,
      total: 0,
      imageUrl: getCatalogItemImageUrl(row.item_name, ""),
      players: [],
    };
    group.total += 1;
    group.players.push({
      id: row.id,
      nickname: row.nickname,
      discordUserId: row.discord_user_id,
      registeredAtText: row.registered_at_text,
      createdAt: row.created_at.toISOString(),
    });
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (b.total !== a.total) return b.total - a.total;
    return a.item_name.localeCompare(b.item_name);
  });
}
