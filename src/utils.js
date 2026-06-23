const crypto = require("crypto");
const { ALLOWED_CHANNEL_NAME, PT_BR_COMMANDS } = require("./config");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

function shortStableHash(value) {
  return crypto
    .createHash("sha1")
    .update(String(value || ""))
    .digest("hex")
    .slice(0, 12);
}

function normalizeQueueItemName(value) {
  return String(value || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function tokenizeSearchQuery(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function scoreSearchMatch(candidate, query) {
  const normalizedCandidate = normalizeSearchText(candidate);
  const tokens = tokenizeSearchQuery(query);

  if (!tokens.length) return 1;
  if (!normalizedCandidate) return 0;

  let score = 0;
  let lastIndex = -1;

  for (const token of tokens) {
    const index = normalizedCandidate.indexOf(token);
    if (index === -1) return 0;

    score += 20;
    if (index === 0) score += 20;
    if (index > lastIndex) score += 5;
    lastIndex = index;
  }

  if (normalizedCandidate.includes(tokens.join(" "))) score += 30;
  if (normalizedCandidate.startsWith(tokens[0])) score += 10;

  return score;
}

function getUserDisplayName(user) {
  return user?.globalName ?? user?.username ?? user?.tag ?? "unknown";
}

function getRequiredOptionAny(interaction, names) {
  for (const name of names) {
    const value = interaction.options.getString(name, false);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  throw new Error(`Missing required option. Tried: ${names.join(", ")}`);
}

function getOptionalOptionAny(interaction, names) {
  for (const name of names) {
    const value = interaction.options.getString(name, false);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isPtBrCommand(interaction) {
  if (interaction?.locale) return String(interaction.locale).toLowerCase().startsWith("pt");
  return PT_BR_COMMANDS.has(interaction?.commandName);
}

function tr(interaction, ptBr, en) {
  return isPtBrCommand(interaction) ? ptBr : en;
}

function isAllowedChannel(interaction) {
  return (interaction.channel && interaction.channel.name) === ALLOWED_CHANNEL_NAME;
}

function interactionOptionsToSimpleArray(interaction) {
  const data = interaction?.options?.data ?? [];
  return data.map((o) => ({
    name: o.name,
    value: o.value,
    type: o.type,
  }));
}

async function respondAutocompleteOnce(interaction, results) {
  if (interaction.responded) return;
  try {
    await interaction.respond(results);
  } catch (err) {
    if (err?.code === 40060) return;
    throw err;
  }
}

function nowBrasilia() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function parseBrazilianDateTime(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const brMatch = trimmed.match(
    /(\d{2})\/(\d{2})\/(\d{4})(?:[^\d]*(\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (brMatch) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] = brMatch;
    const brDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`);
    return Number.isNaN(brDate.getTime()) ? null : brDate;
  }

  const isoMatch = trimmed.match(
    /(\d{4})-(\d{2})-(\d{2})(?:[^\d]*(\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (isoMatch) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] = isoMatch;
    const isoDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  const ts = Date.parse(trimmed);
  return Number.isNaN(ts) ? null : new Date(ts);
}

module.exports = {
  MS_PER_DAY,
  getOptionalOptionAny,
  getRequiredOptionAny,
  getUserDisplayName,
  interactionOptionsToSimpleArray,
  isAllowedChannel,
  normalizeSearchText,
  normalizeQueueItemName,
  nowBrasilia,
  parseBrazilianDateTime,
  respondAutocompleteOnce,
  safeJsonStringify,
  scoreSearchMatch,
  shortStableHash,
  tokenizeSearchQuery,
  tr,
};
