const DISCORD_API_BASE = "https://discord.com/api/v10";
const ADMINISTRATOR_PERMISSION = 8n;

export type DiscordGuild = {
  id: string;
  name: string;
  owner?: boolean;
  permissions?: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string;
};

export function getAppBaseUrl() {
  const explicit = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getRedirectUri() {
  return process.env.DISCORD_REDIRECT_URI || `${getAppBaseUrl()}/api/auth/callback`;
}

export function buildDiscordLoginUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function buildBotInviteUrl(guildId: string) {
  const params = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    scope: "bot applications.commands",
    permissions: "0",
    guild_id: guildId,
    disable_guild_select: "true",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    client_id: requiredEnv("DISCORD_CLIENT_ID"),
    client_secret: requiredEnv("DISCORD_CLIENT_SECRET"),
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
  });
  const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseDiscordResponse<{ access_token: string }>(res);
}

export async function fetchCurrentUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseDiscordResponse<DiscordUser>(res);
}

export async function fetchCurrentUserGuilds(accessToken: string) {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const guilds = await parseDiscordResponse<DiscordGuild[]>(res);
  return guilds.filter(canManageGuild);
}

export async function fetchBotGuild(guildId: string) {
  const res = await botFetch(`/guilds/${guildId}`);
  if (res.status === 403 || res.status === 404) return null;
  return parseDiscordResponse<DiscordGuild>(res);
}

export async function fetchGuildChannels(guildId: string) {
  const res = await botFetch(`/guilds/${guildId}/channels`);
  if (res.status === 403 || res.status === 404) return [];
  const channels = await parseDiscordResponse<Array<{ id: string; name: string; type: number; position: number }>>(res);
  return channels
    .filter((channel) => [0, 5, 15].includes(Number(channel.type)))
    .sort((a, b) => Number(a.position) - Number(b.position));
}

export async function fetchGuildRoles(guildId: string) {
  const res = await botFetch(`/guilds/${guildId}/roles`);
  if (res.status === 403 || res.status === 404) return [];
  const roles = await parseDiscordResponse<Array<{ id: string; name: string; position: number }>>(res);
  return roles
    .filter((role) => role.id !== guildId)
    .sort((a, b) => Number(b.position) - Number(a.position));
}

function canManageGuild(guild: DiscordGuild) {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions || 0) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
  } catch {
    return false;
  }
}

function botFetch(path: string) {
  return fetch(`${DISCORD_API_BASE}${path}`, {
    headers: { Authorization: `Bot ${requiredEnv("DISCORD_TOKEN")}` },
    next: { revalidate: 60 },
  });
}

async function parseDiscordResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.ok) return data as T;
  throw new Error(`Discord API ${res.status}: ${data?.message || res.statusText}`);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}
