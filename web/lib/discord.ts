const DISCORD_API_BASE = "https://discord.com/api/v10";
const ADMINISTRATOR_PERMISSION = 8n;
const VIEW_CHANNEL_PERMISSION = 1024n;
const SEND_MESSAGES_PERMISSION = 2048n;
const EMBED_LINKS_PERMISSION = 16384n;
const READ_MESSAGE_HISTORY_PERMISSION = 65536n;

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

export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  permission_overwrites?: DiscordPermissionOverwrite[];
};

export type DiscordRole = {
  id: string;
  name: string;
  position: number;
  permissions: string;
};

type DiscordPermissionOverwrite = {
  id: string;
  type: number;
  allow: string;
  deny: string;
};

type DiscordGuildMember = {
  user?: DiscordUser;
  roles: string[];
};

export type GuildBotStatus = {
  botInstalled: boolean;
  botUserId: string;
  configuredChannelId: string;
  channelExists: boolean;
  channelName: string;
  permissions: {
    viewChannel: boolean;
    sendMessages: boolean;
    embedLinks: boolean;
    readMessageHistory: boolean;
  };
  canSendPanel: boolean;
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
  const channels = await parseDiscordResponse<DiscordChannel[]>(res);
  return channels
    .filter((channel) => [0, 5, 15].includes(Number(channel.type)))
    .sort((a, b) => Number(a.position) - Number(b.position));
}

export async function fetchGuildRoles(guildId: string) {
  const res = await botFetch(`/guilds/${guildId}/roles`);
  if (res.status === 403 || res.status === 404) return [];
  const roles = await parseDiscordResponse<DiscordRole[]>(res);
  return roles
    .filter((role) => role.id !== guildId)
    .sort((a, b) => Number(b.position) - Number(a.position));
}

export async function getGuildBotStatus(guildId: string, configuredChannelId: string): Promise<GuildBotStatus> {
  const botUser = await fetchBotUser().catch(() => null);
  const [guild, channels, roles, member] = await Promise.all([
    fetchBotGuild(guildId).catch(() => null),
    fetchGuildChannels(guildId).catch(() => []),
    fetchGuildRolesWithEveryone(guildId).catch(() => []),
    botUser ? fetchBotGuildMember(guildId, botUser.id).catch(() => null) : Promise.resolve(null),
  ]);
  const channel = channels.find((item) => item.id === configuredChannelId) || null;
  const permissions = guild && channel && member
    ? getBotChannelPermissions({ guildId, channel, roles, member, botUserId: botUser?.id || "" })
    : 0n;
  const result = {
    viewChannel: hasPermission(permissions, VIEW_CHANNEL_PERMISSION),
    sendMessages: hasPermission(permissions, SEND_MESSAGES_PERMISSION),
    embedLinks: hasPermission(permissions, EMBED_LINKS_PERMISSION),
    readMessageHistory: hasPermission(permissions, READ_MESSAGE_HISTORY_PERMISSION),
  };
  return {
    botInstalled: Boolean(guild && botUser),
    botUserId: botUser?.id || "",
    configuredChannelId,
    channelExists: Boolean(channel),
    channelName: channel?.name || "",
    permissions: result,
    canSendPanel: Boolean(channel && result.viewChannel && result.sendMessages && result.embedLinks),
  };
}

export async function sendGuildChannelTest(guildId: string, channelId: string) {
  const status = await getGuildBotStatus(guildId, channelId);
  if (!status.canSendPanel) throw new Error("Bot sem permissao para enviar mensagem no canal configurado.");
  await sendChannelMessage(channelId, {
    content: "Teste do painel web: o bot consegue enviar mensagens neste canal.",
  });
}

export async function sendGuildControlPanel(guildId: string, channelId: string, locale: string) {
  const status = await getGuildBotStatus(guildId, channelId);
  if (!status.canSendPanel) throw new Error("Bot sem permissao para reenviar o painel no canal configurado.");
  await sendChannelMessage(channelId, buildControlPanelPayload(locale));
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

function botFetchNoStore(path: string, init: RequestInit = {}) {
  return fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${requiredEnv("DISCORD_TOKEN")}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

async function fetchBotUser() {
  const res = await botFetchNoStore("/users/@me");
  return parseDiscordResponse<DiscordUser>(res);
}

async function fetchBotGuildMember(guildId: string, botUserId: string) {
  const res = await botFetchNoStore(`/guilds/${guildId}/members/${botUserId}`);
  if (res.status === 403 || res.status === 404) return null;
  return parseDiscordResponse<DiscordGuildMember>(res);
}

async function fetchGuildRolesWithEveryone(guildId: string) {
  const res = await botFetchNoStore(`/guilds/${guildId}/roles`);
  if (res.status === 403 || res.status === 404) return [];
  return parseDiscordResponse<DiscordRole[]>(res);
}

async function sendChannelMessage(channelId: string, payload: unknown) {
  const res = await botFetchNoStore(`/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await parseDiscordResponse<unknown>(res);
}

function getBotChannelPermissions({
  guildId,
  channel,
  roles,
  member,
  botUserId,
}: {
  guildId: string;
  channel: DiscordChannel;
  roles: DiscordRole[];
  member: DiscordGuildMember;
  botUserId: string;
}) {
  const roleById = new Map(roles.map((role) => [role.id, role]));
  let permissions = parsePermissions(roleById.get(guildId)?.permissions || "0");
  for (const roleId of member.roles || []) {
    permissions |= parsePermissions(roleById.get(roleId)?.permissions || "0");
  }
  if (hasPermission(permissions, ADMINISTRATOR_PERMISSION)) {
    return permissions | VIEW_CHANNEL_PERMISSION | SEND_MESSAGES_PERMISSION | EMBED_LINKS_PERMISSION | READ_MESSAGE_HISTORY_PERMISSION;
  }

  const overwrites = channel.permission_overwrites || [];
  const everyone = overwrites.find((overwrite) => overwrite.id === guildId && overwrite.type === 0);
  permissions = applyOverwrite(permissions, everyone);

  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type !== 0 || !member.roles.includes(overwrite.id)) continue;
    roleAllow |= parsePermissions(overwrite.allow);
    roleDeny |= parsePermissions(overwrite.deny);
  }
  permissions &= ~roleDeny;
  permissions |= roleAllow;

  const memberOverwrite = overwrites.find((overwrite) => overwrite.id === botUserId && overwrite.type === 1);
  return applyOverwrite(permissions, memberOverwrite);
}

function applyOverwrite(permissions: bigint, overwrite?: DiscordPermissionOverwrite) {
  if (!overwrite) return permissions;
  permissions &= ~parsePermissions(overwrite.deny);
  permissions |= parsePermissions(overwrite.allow);
  return permissions;
}

function hasPermission(permissions: bigint, permission: bigint) {
  return (permissions & permission) === permission;
}

function parsePermissions(value: string) {
  try {
    return BigInt(value || "0");
  } catch {
    return 0n;
  }
}

function buildControlPanelPayload(locale: string) {
  const pt = String(locale || "pt-BR").startsWith("pt");
  return {
    embeds: [
      {
        color: 0x65b0fc,
        title: pt ? "Painel Archboss" : "Archboss Panel",
        description: pt
          ? "Use os botoes abaixo para registrar seus itens e consultar sua lista sem precisar digitar comandos."
          : "Use the buttons below to register your items and check your wishlist without typing commands.",
        footer: { text: "TL control panel" },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, custom_id: "panel:register_arch", label: pt ? "Registrar arma Archboss" : "Register Archboss weapon", style: 1 },
          { type: 2, custom_id: "panel:register_rare", label: pt ? "Registrar item raro" : "Register rare item", style: 1 },
          { type: 2, custom_id: "panel:my_items", label: pt ? "Meus itens" : "My items", style: 2 },
        ],
      },
      {
        type: 1,
        components: [
          { type: 2, custom_id: "panel:queue_arch", label: pt ? "Ver fila Archboss" : "View Archboss queue", style: 3 },
          { type: 2, custom_id: "panel:queue_rare", label: pt ? "Ver fila item raro" : "View rare item queue", style: 3 },
        ],
      },
    ],
  };
}

async function parseDiscordResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.ok) return data as T;
  throw new Error(
    `Discord API ${res.status}: ${data?.error_description || data?.message || data?.error || res.statusText}`
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}
