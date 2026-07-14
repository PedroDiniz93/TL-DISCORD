const { ADMIN_ROLE_ID, ADMIN_ROLE_NAME, ALLOWED_CHANNEL_ID, ALLOWED_CHANNEL_NAME } = require("./config");
const { query } = require("./db");

const DEFAULT_LIMITS = {
  archWeapons: 1,
  rareEquips: 1,
  rareAccessories: 3,
  worldBossWeaponsT4: 1,
  skillCores: 1,
};

async function ensureGuild(discordGuildId, fields = {}) {
  const id = String(discordGuildId || "").trim();
  if (!id) throw new Error("Missing Discord guild id.");

  const result = await query(
    `INSERT INTO guilds (discord_guild_id, name, owner_discord_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (discord_guild_id)
     DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), guilds.name),
                   owner_discord_user_id = COALESCE(NULLIF(EXCLUDED.owner_discord_user_id, ''), guilds.owner_discord_user_id),
                   updated_at = now()
     RETURNING id, discord_guild_id, name, owner_discord_user_id`,
    [
      id,
      String(fields.name || "").trim(),
      String(fields.ownerDiscordUserId || "").trim(),
    ]
  );

  await query(
    `INSERT INTO guild_settings (guild_id, allowed_channel_id, admin_role_id, locale, rules)
     VALUES ($1, $2, $3, 'pt-BR', $4::jsonb)
     ON CONFLICT (guild_id) DO NOTHING`,
    [
      result.rows[0].id,
      ALLOWED_CHANNEL_ID,
      ADMIN_ROLE_ID,
      JSON.stringify(defaultRules()),
    ]
  );

  return result.rows[0];
}

async function getGuildSettings(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);
  const result = await query(
    `SELECT
       g.id,
       g.discord_guild_id,
       g.name,
       gs.allowed_channel_id,
       gs.admin_role_id,
       gs.locale,
       gs.rules,
       s.plan,
       s.status,
       s.current_period_ends_at
     FROM guilds g
     LEFT JOIN guild_settings gs ON gs.guild_id = g.id
     LEFT JOIN subscriptions s ON s.guild_id = g.id
     WHERE g.id = $1`,
    [guild.id]
  );
  return normalizeSettings(result.rows[0]);
}

async function getConfiguredPanelGuilds() {
  const result = await query(
    `SELECT g.discord_guild_id, gs.allowed_channel_id
       FROM guilds g
       JOIN guild_settings gs ON gs.guild_id = g.id
      WHERE COALESCE(gs.allowed_channel_id, '') <> ''
      ORDER BY g.created_at ASC`
  );

  return result.rows.map((row) => ({
    discordGuildId: String(row.discord_guild_id || "").trim(),
    allowedChannelId: String(row.allowed_channel_id || "").trim(),
  }));
}

async function saveGuildSettings(discordGuildId, settings) {
  const guild = await ensureGuild(discordGuildId, {
    name: settings.guildName,
    ownerDiscordUserId: settings.ownerDiscordUserId,
  });
  const rules = normalizeRules(settings.rules);

  await query(
    `INSERT INTO guild_settings (guild_id, allowed_channel_id, admin_role_id, locale, rules)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (guild_id)
     DO UPDATE SET allowed_channel_id = EXCLUDED.allowed_channel_id,
                   admin_role_id = EXCLUDED.admin_role_id,
                   locale = EXCLUDED.locale,
                   rules = EXCLUDED.rules,
                   updated_at = now()`,
    [
      guild.id,
      String(settings.allowedChannelId || "").trim(),
      firstAdminRoleId(rules),
      String(settings.locale || "pt-BR").trim(),
      JSON.stringify(rules),
    ]
  );

  if (settings.actorDiscordUserId) {
    await query(
      `INSERT INTO audit_logs (guild_id, discord_user_id, action, source, status, payload)
       VALUES ($1, $2, 'guild_settings.update', 'web_panel', 'OK', $3::jsonb)`,
      [
        guild.id,
        String(settings.actorDiscordUserId),
        JSON.stringify({
          allowedChannelId: settings.allowedChannelId || "",
          adminRoleIds: rules.adminRoleIds,
          limits: rules.limits,
          enabledArchItems: rules.enabledItems.arch.length,
          enabledRareItems: rules.enabledItems.rare.length,
        }),
      ]
    );
  }

  return getGuildSettings(discordGuildId);
}

async function getSubscription(discordGuildId) {
  const guild = await ensureGuild(discordGuildId);
  const result = await query(
    `SELECT plan, status, current_period_ends_at, limits
       FROM subscriptions
      WHERE guild_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [guild.id]
  );

  return result.rows[0] || {
    plan: "free",
    status: "trial",
    current_period_ends_at: null,
    limits: {},
  };
}

async function getRulesForInteraction(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  return settings.rules;
}

function isItemEnabled(rules, type, itemName) {
  const enabled = rules?.enabledItems?.[type] || [];
  if (!enabled.length) return true;
  return enabled.includes(itemName);
}

async function isAllowedChannelForInteraction(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  if (settings.allowedChannelId) return interaction.channelId === settings.allowedChannelId;
  if (ALLOWED_CHANNEL_ID) return interaction.channelId === ALLOWED_CHANNEL_ID;
  return (interaction.channel && interaction.channel.name) === ALLOWED_CHANNEL_NAME;
}

function normalizeSettings(row) {
  const rules = normalizeRules(row?.rules || {});
  return {
    id: row?.id,
    discordGuildId: String(row?.discord_guild_id || "").trim(),
    name: String(row?.name || "").trim(),
    allowedChannelId: String(row?.allowed_channel_id || ALLOWED_CHANNEL_ID || "").trim(),
    adminRoleId: String(row?.admin_role_id || ADMIN_ROLE_ID || "").trim(),
    adminRoleIds: rules.adminRoleIds,
    locale: String(row?.locale || "pt-BR").trim(),
    rules,
    subscription: {
      plan: String(row?.plan || "free").trim(),
      status: String(row?.status || "trial").trim(),
      currentPeriodEndsAt: row?.current_period_ends_at || null,
    },
  };
}

function normalizeRules(input) {
  const source = typeof input === "object" && input ? input : {};
  const limits = {
    ...DEFAULT_LIMITS,
    ...(typeof source.limits === "object" && source.limits ? source.limits : {}),
  };

  return {
    adminRoleIds: toCleanStringArray(source.adminRoleIds || source.admin_role_ids),
    limits: {
      archWeapons: toPositiveInt(limits.archWeapons, DEFAULT_LIMITS.archWeapons),
      rareEquips: toPositiveInt(limits.rareEquips, DEFAULT_LIMITS.rareEquips),
      rareAccessories: toPositiveInt(limits.rareAccessories, DEFAULT_LIMITS.rareAccessories),
      worldBossWeaponsT4: toPositiveInt(
        limits.worldBossWeaponsT4,
        DEFAULT_LIMITS.worldBossWeaponsT4
      ),
      skillCores: toPositiveInt(limits.skillCores, DEFAULT_LIMITS.skillCores),
    },
    enabledItems: {
      arch: toCleanStringArray(source.enabledItems?.arch),
      rare: toCleanStringArray(source.enabledItems?.rare),
    },
  };
}

function defaultRules() {
  return normalizeRules({
    adminRoleIds: ADMIN_ROLE_ID ? [ADMIN_ROLE_ID] : [],
    limits: DEFAULT_LIMITS,
    enabledItems: {
      arch: [],
      rare: [],
    },
  });
}

function firstAdminRoleId(rules) {
  return rules.adminRoleIds[0] || ADMIN_ROLE_ID || "";
}

function toCleanStringArray(value) {
  const source = Array.isArray(value) ? value : [];
  return [...new Set(source.map((item) => String(item || "").trim()).filter(Boolean))];
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

module.exports = {
  DEFAULT_LIMITS,
  defaultRules,
  ensureGuild,
  getConfiguredPanelGuilds,
  getGuildSettings,
  getRulesForInteraction,
  getSubscription,
  isAllowedChannelForInteraction,
  isItemEnabled,
  normalizeRules,
  saveGuildSettings,
};
