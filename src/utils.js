const { ALLOWED_CHANNEL_NAME, PT_BR_COMMANDS } = require("./config");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

function normalizeQueueItemName(value) {
  return String(value || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
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

function isPtBrCommand(interaction) {
  return (
    PT_BR_COMMANDS.has(interaction?.commandName) ||
    String(interaction?.locale || "").toLowerCase().startsWith("pt")
  );
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
  getRequiredOptionAny,
  getUserDisplayName,
  interactionOptionsToSimpleArray,
  isAllowedChannel,
  normalizeQueueItemName,
  nowBrasilia,
  parseBrazilianDateTime,
  respondAutocompleteOnce,
  safeJsonStringify,
  tr,
};
