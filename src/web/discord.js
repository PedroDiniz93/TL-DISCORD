const DISCORD_API_BASE = "https://discord.com/api/v10";
const ADMINISTRATOR_PERMISSION = 8n;

function getOAuthConfig() {
  const clientId = String(process.env.DISCORD_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.DISCORD_CLIENT_SECRET || "").trim();
  const redirectUri = getOAuthRedirectUri();
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret && redirectUri),
  };
}

function getOAuthRedirectUri() {
  const explicit = String(process.env.DISCORD_REDIRECT_URI || "").trim();
  if (explicit) return explicit;

  const baseUrl = String(process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/oauth/callback` : "";
}

function buildAuthorizationUrl(state) {
  const config = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

function buildBotInviteUrl(guildId = "") {
  const clientId = String(process.env.DISCORD_CLIENT_ID || "").trim();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: "0",
  });
  if (guildId) {
    params.set("guild_id", String(guildId));
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const config = getOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return parseDiscordResponse(res);
}

async function fetchCurrentUser(accessToken) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return parseDiscordResponse(res);
}

async function fetchCurrentUserGuilds(accessToken) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const guilds = await parseDiscordResponse(res);
  return guilds.filter(canManageGuild);
}

async function fetchBotGuild(guildId) {
  const res = await discordBotFetch(`/guilds/${guildId}`);
  if (res.status === 404 || res.status === 403) return null;
  return parseDiscordResponse(res);
}

async function fetchGuildChannels(guildId) {
  const res = await discordBotFetch(`/guilds/${guildId}/channels`);
  if (res.status === 404 || res.status === 403) return [];
  const channels = await parseDiscordResponse(res);
  return channels
    .filter((channel) => [0, 5, 15].includes(Number(channel.type)))
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
}

async function fetchGuildRoles(guildId) {
  const res = await discordBotFetch(`/guilds/${guildId}/roles`);
  if (res.status === 404 || res.status === 403) return [];
  const roles = await parseDiscordResponse(res);
  return roles
    .filter((role) => role.id !== guildId)
    .sort((a, b) => Number(b.position || 0) - Number(a.position || 0));
}

function canManageGuild(guild) {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions || 0) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
  } catch {
    return false;
  }
}

async function discordBotFetch(path) {
  const token = String(process.env.DISCORD_TOKEN || "").trim();
  return fetch(`${DISCORD_API_BASE}${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
  });
}

async function parseDiscordResponse(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.ok) return data;
  const message = data?.message || res.statusText || "Discord API error";
  throw new Error(`Discord API ${res.status}: ${message}`);
}

module.exports = {
  buildAuthorizationUrl,
  buildBotInviteUrl,
  fetchBotGuild,
  fetchCurrentUser,
  fetchCurrentUserGuilds,
  fetchGuildChannels,
  fetchGuildRoles,
  exchangeCodeForToken,
  getOAuthConfig,
};
