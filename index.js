require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  InteractionResponseFlags,
} = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const ARCH_SHEET_TITLE = "LISTA DESEJO ARCH";
const ARCH_HEADERS = ["Data", "Nick", "Arma", "DiscordUserId"];
const RARE_ITEM_SHEET_TITLE = "LISTA DESEJO ITEM RARO";
const RARE_ITEM_HEADERS = ["Data", "Nick", "Item", "DiscordUserId"];
const ARCH_HISTORY_SHEET_TITLE = "HISTORICO DE GANHO ARCH BOSS";
const ARCH_HISTORY_HEADERS = ["Data/Hora", "Player", "Item (Arma)", "DiscordUserId"];
const RARE_ITEM_HISTORY_SHEET_TITLE = "HISTORICO DE GANHO ITEM RARO";
const RARE_ITEM_HISTORY_HEADERS = ["Data/Hora", "Player", "Item", "DiscordUserId"];
const ARCH_COOLDOWN_DAYS_BEFORE_CUTOFF = 10;
const ARCH_COOLDOWN_DAYS_FROM_MAR_12_2026 = 20;
const ARCH_COOLDOWN_CUTOFF_DATE = new Date(2026, 2, 12); // 12/03/2026 (month is 0-based)
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOG_DIR = path.join(__dirname, "logs");
const COMMAND_LOG_PATH = path.join(LOG_DIR, "commands.log");
const ARCH_WEAPON_ICON_DIR = path.join(__dirname, "assets", "icons", "arch-weapons");
const ARCH_WEAPON_ICON_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

const ARCH_WEAPONS = [
  { name: "Espadão do Cordy (Cordy Greatsword)", iconSlug: "cordy-greatsword", fallbackIcon: "🗡️" },
  { name: "Espadão do Tevent (Tevent Greatsword)", iconSlug: "tevent-greatsword", fallbackIcon: "🗡️" },
  { name: "Espada e Escudo da Deluznoa (Deluznoa Sword and Shield)", iconSlug: "deluznoa-sword-and-shield", fallbackIcon: "🛡️"},
  { name: "Espada e Escudo da Belandir (Belandir Sword and Shield)", iconSlug: "belandir-sword-and-shield", fallbackIcon: "🛡️"},
  { name: "Adaga da Deluznoa (Deluznoa Dagger)", iconSlug: "deluznoa-dagger", fallbackIcon: "⚔️" },
  { name: "Adaga do Tevent (Tevent Dagger)", iconSlug: "tevent-dagger", fallbackIcon: "⚔️" },
  { name: "Balestra do Cordy (Cordy Crossbow)", iconSlug: "cordy-crossbow", fallbackIcon: "🎯" },
  { name: "Balestra da Belandir (Belandir Crossbow)", iconSlug: "belandir-crossbow", fallbackIcon: "🎯" },
  { name: "Arco do Tevent (Tevent Bow)", iconSlug: "tevent-bow", fallbackIcon: "🏹" },
  { name: "Arco da Deluznoa (Deluznoa Bow)", iconSlug: "deluznoa-bow", fallbackIcon: "🏹" },
  { name: "Cajado da Deluznoa (Deluznoa Staff)", iconSlug: "deluznoa-staff", fallbackIcon: "⚡" },
  { name: "Cajado da Belandir (Belandir Staff)", iconSlug: "belandir-staff", fallbackIcon: "⚡" },
  { name: "Varinha do Tevent (Tevent Wand)", iconSlug: "tevent-wand", fallbackIcon: "🪄" },
  { name: "Varinha do Cordy (Cordy Wand)", iconSlug: "cordy-wand", fallbackIcon: "🪄" },
  { name: "Lança da Deluznoa (Deluznoa Spear)", iconSlug: "deluznoa-spear", fallbackIcon: "🗡️" },
  { name: "Lança da Belandir (Belandir Spear)", iconSlug: "belandir-spear", fallbackIcon: "🗡️" },
  { name: "Orb do Tevent (Tevent Orb)", iconSlug: "tevent-orb", fallbackIcon: "🔮" },
  { name: "Orb do Cordy (Cordy Orb)", iconSlug: "cordy-orb", fallbackIcon: "🔮" },
];

const weapons = ARCH_WEAPONS.map((weapon) => weapon.name);
const archWeaponByNormalizedName = new Map(
  ARCH_WEAPONS.map((weapon) => [normalizeQueueItemName(weapon.name), weapon])
);
const archWeaponIconPrefixByName = new Map();

const rareItems = [
  "Brooch of Certainty (Broche da Certeza)",
  "Brooch of Nimblesness (Broche da Agilidade)",
  "Brooch of Devastation (Broche da Devastação)",
  "Brooch of Everlasting (Broche da Eternidade)",
  "Brooch of Power Overwhelming (Broche do Poder Avassalador)",
  "Brooch of Awareness (Broche da Consciencia)",
  "Brooch of Primacy (Broche da Primazia)",
  "Sundering Brooch (Broche da Separação)",
  "Ballistic Brooch (Broche da Balistica)",
  "Tempest Brooch (Broche da Tempestade)",
  "Grand Aelon's Longbow of Blight (Arco Longo do Flagelo de Grande Aelon)",
  "Kowazan's Daggers of the Blood Moon (Adagas da Lua Sangrenta de Kowazan)",
  "Aridus's Immolated Voidstaff (Cajado do Vazio Imolado de Aridus)",
  "Talus's Incandescent Staff (Cajado Incandescente de Talus)",
  "Nirma's Sword of Falling Ash (Espada da Cinza Cadente de Nirma)",
  "Adentus's Cinderhulk Greatsword (Espada de Duas Mãos Verdinza de Adentus)",
  "Morokai's Soulfire Greatblade (Grande Lâmina Embrasalma de Morokai)",
  "Daigon's Charred Emberstaff (Cajado Abrasador Carbonizado de Daigon)",
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Soaring Emblem Ring (Anel do Emblema Ascendente)",
  "Kowazan's Crossbows of the Eclipse (Balestras do Eclipse de Kowazan)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Undying Star Necklace (Colar da Estrela Imortal)",
  "Extinction-proof Periapt (Periapto à Prova de Extinção)",
  "Necklace of Morning Mist (Colar da Névoa da Manhã)",
  "Bracelet of the Evening Tide (Bracelete da Maré Noturna)",
  "Ring of Forbidden Lust (Anel da Luxúria Esquecida)",
  "Coil of Righteous Demand (Espiral da Exigência Virtuosa)",
  "Ring of Divine Retribution (Anel da Retribuição Divina)",
  "Ring of Repeated Death (Anel da Morte Repetida)",
  "Wildcrest Studs (Adornos da Crista Selvagem)",
  "Talus's Transcendent Core (Núcleo Transcendente de Talus)",
  "Ring of Falling Dusk (Anel do Anoitecer)",
  "Cornelius's Blade of Dancing Flame (Lâmina da Flama Dançante de Cornélius)",
  "Malakar's Flamespike Crossbows (Balestras Espinholumes de Malakar)",
  "Akman's Bloodletting Crossbows (Balestras Sangrentas de Akman)",
  "Deckman's Balefire Scepter (Cetro Abraseirado de Deckman)",
  "Belt of Clutching Fear (Cinto do Medo Angustiante)",
  "Belt of the Dying Spark (Cinto da Centelha Esmorecente)",
  "Ring of Fractal Growth (Anel da Evolução Fractal)",
  "Necklace of Dawn's Light (Colar da Luz da Alvorada)",
  "Bracelet of Radiant Chains (Bracelete das Correntes Radiantes)",
  "Blood Crescent Pendant (Pingente da Crescente Sangrenta)",
  "Sash of Rustling Leaves (Faixa das Folhas Farfalhantes)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
  "Signet of the Alpha (Sinete do alfa)",
  "Junobote's Extra Smoldering Ranseur (Ranseur Esbraseantissimo de Junobote)",
  "Junobote's Blade of the Red Colossus (Lamina do Colosso Vermelho de Junobote)",
];

const RARE_WEAPON_ITEMS = new Set([
  "Grand Aelon's Longbow of Blight (Arco Longo do Flagelo de Grande Aelon)",
  "Kowazan's Daggers of the Blood Moon (Adagas da Lua Sangrenta de Kowazan)",
  "Aridus's Immolated Voidstaff (Cajado do Vazio Imolado de Aridus)",
  "Talus's Incandescent Staff (Cajado Incandescente de Talus)",
  "Nirma's Sword of Falling Ash (Espada da Cinza Cadente de Nirma)",
  "Adentus's Cinderhulk Greatsword (Espada de Duas Mãos Verdinza de Adentus)",
  "Morokai's Soulfire Greatblade (Grande Lâmina Embrasalma de Morokai)",
  "Daigon's Charred Emberstaff (Cajado Abrasador Carbonizado de Daigon)",
  "Kowazan's Crossbows of the Eclipse (Balestras do Eclipse de Kowazan)",
  "Cornelius's Blade of Dancing Flame (Lâmina da Flama Dançante de Cornélius)",
  "Malakar's Flamespike Crossbows (Balestras Espinholumes de Malakar)",
  "Akman's Bloodletting Crossbows (Balestras Sangrentas de Akman)",
  "Deckman's Balefire Scepter (Cetro Abraseirado de Deckman)",
  "Talus's Transcendent Core (Núcleo Transcendente de Talus)",
  "Junobote's Extra Smoldering Ranseur (Ranseur Esbraseantissimo de Junobote)",
  "Junobote's Blade of the Red Colossus (Lamina do Colosso Vermelho de Junobote)"
]);

const RARE_ARMOR_ITEMS = new Set([
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)"
]);

const MAX_RARE_ACCESSORIES_PER_USER = 3;
const MAX_RARE_ARMORS_PER_USER = 1;

function isRareWeapon(itemName) {
  return RARE_WEAPON_ITEMS.has(itemName);
}

function isRareArmor(itemName) {
  return RARE_ARMOR_ITEMS.has(itemName);
}

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 };
const HEADER_FG = { red: 1, green: 1, blue: 1 };

const ALLOWED_CHANNEL_NAME = "🎢planilha-arch-boss";
const PT_BR_COMMANDS = new Set([
  "arma_arch",
  "listar_arch",
  "remover_arch",
  "fila_arch",
  "item_raro",
  "remover_item_raro",
  "fila_item_raro",
]);

/**
 * Safely stringify an object, returning empty string on failure.
 * @param {unknown} obj
 * @returns {string}
 */
function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

/**
 * Pick cooldown days based on fixed cutoff date (12/03/2026).
 * @param {Date} lastDate
 * @returns {number}
 */
function getCooldownDaysForDate(lastDate) {
  return lastDate >= ARCH_COOLDOWN_CUTOFF_DATE
    ? ARCH_COOLDOWN_DAYS_FROM_MAR_12_2026
    : ARCH_COOLDOWN_DAYS_BEFORE_CUTOFF;
}

/**
 * Normalize item names for queue matching (strip leading icons/emoji).
 * @param {string} value
 * @returns {string}
 */
function normalizeQueueItemName(value) {
  return String(value || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase();
}

function normalizeArchWeaponValue(value) {
  const normalized = normalizeQueueItemName(value);
  const weapon = archWeaponByNormalizedName.get(normalized);
  return weapon ? weapon.name : String(value || "").trim();
}

function formatArchWeaponDisplay(value) {
  const normalizedName = normalizeArchWeaponValue(value);
  const weapon = archWeaponByNormalizedName.get(normalizeQueueItemName(normalizedName));
  if (!weapon) return normalizedName;
  const icon = archWeaponIconPrefixByName.get(weapon.name) || weapon.fallbackIcon;
  return `${icon} ${weapon.name}`;
}

function getEmojiNameForSlug(slug) {
  return `arch_${slug.replace(/-/g, "_")}`.slice(0, 32);
}

async function getArchWeaponIconFilePath(iconSlug) {
  for (const ext of ARCH_WEAPON_ICON_EXTENSIONS) {
    const filePath = path.join(ARCH_WEAPON_ICON_DIR, `${iconSlug}${ext}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // File with this extension does not exist; continue.
    }
  }
  return null;
}

async function loadArchWeaponIconsFromGuild(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.emojis.fetch();

    for (const weapon of ARCH_WEAPONS) {
      const emojiName = getEmojiNameForSlug(weapon.iconSlug);
      const emoji = guild.emojis.cache.find((entry) => entry.name === emojiName);
      if (emoji) {
        archWeaponIconPrefixByName.set(weapon.name, `<:${emoji.name}:${emoji.id}>`);
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to load Arch weapon emojis from guild:", err?.message || err);
  }
}

async function syncArchWeaponIconsToGuild(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.emojis.fetch();

    for (const weapon of ARCH_WEAPONS) {
      const emojiName = getEmojiNameForSlug(weapon.iconSlug);
      const existingEmoji = guild.emojis.cache.find((entry) => entry.name === emojiName);
      if (existingEmoji) {
        archWeaponIconPrefixByName.set(weapon.name, `<:${existingEmoji.name}:${existingEmoji.id}>`);
        continue;
      }

      const iconFilePath = await getArchWeaponIconFilePath(weapon.iconSlug);
      if (!iconFilePath) continue;

      try {
        const createdEmoji = await guild.emojis.create({
          attachment: iconFilePath,
          name: emojiName,
        });
        archWeaponIconPrefixByName.set(weapon.name, `<:${createdEmoji.name}:${createdEmoji.id}>`);
        console.log(`✅ Uploaded Arch weapon emoji: ${emojiName}`);
      } catch (err) {
        console.error(
          `⚠️ Failed to create emoji ${emojiName}. Keep fallback icon.`,
          err?.message || err
        );
      }
    }
  } catch (err) {
    console.error("⚠️ Failed to sync Arch weapon icons to guild:", err?.message || err);
  }
}

/**
 * Get the best display name for a Discord user.
 * @param {object} user
 * @returns {string}
 */
function getUserDisplayName(user) {
  return user?.globalName ?? user?.username ?? user?.tag ?? "unknown";
}

/**
 * Read a required string option from an interaction and trim it.
 * @param {object} interaction
 * @param {string} name
 * @returns {string}
 */
function getRequiredOption(interaction, name) {
  return interaction.options.getString(name, true).trim();
}

/**
 * Read required option from the first available name in the provided list.
 * @param {object} interaction
 * @param {string[]} names
 * @returns {string}
 */
function getRequiredOptionAny(interaction, names) {
  for (const name of names) {
    const value = interaction.options.getString(name, false);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  throw new Error(`Missing required option. Tried: ${names.join(", ")}`);
}

function isPtBrCommand(interaction) {
  return PT_BR_COMMANDS.has(interaction?.commandName);
}

function tr(interaction, ptBr, en) {
  return isPtBrCommand(interaction) ? ptBr : en;
}

/**
 * Check if the interaction is in the allowed channel.
 * @param {object} interaction
 * @returns {boolean}
 */
function isAllowedChannel(interaction) {
  return (interaction.channel && interaction.channel.name) === ALLOWED_CHANNEL_NAME;
}

/**
 * Convert interaction options to a plain array for logging.
 * @param {object} interaction
 * @returns {Array<{name: string, value: unknown, type: number}>}
 */
function interactionOptionsToSimpleArray(interaction) {
  const data = interaction?.options?.data ?? [];
  return data.map((o) => ({
    name: o.name,
    value: o.value,
    type: o.type,
  }));
}

/**
 * Respond to autocomplete once, ignoring duplicate acknowledgements.
 * @param {object} interaction
 * @param {Array<{name: string, value: string}>} results
 * @returns {Promise<void>}
 */
async function respondAutocompleteOnce(interaction, results) {
  if (interaction.responded) return;
  try {
    await interaction.respond(results);
  } catch (err) {
    if (err?.code === 40060) return;
    throw err;
  }
}

/**
 * Append command execution info to a local log file.
 * @param {object} params
 * @param {object} params.interaction
 * @param {string} params.status
 * @param {Error | null} params.err
 * @returns {Promise<void>}
 */
async function appendCommandLog({ interaction, status, err }) {
  try {
    const optionsArr = interactionOptionsToSimpleArray(interaction);

    const entry = {
      timestamp: nowBrasilia(),
      discordUserId: interaction.user?.id ?? "",
      name: getUserDisplayName(interaction.user),
      command: interaction.commandName ?? "",
      guildId: interaction.guildId ?? "",
      channelId: interaction.channelId ?? "",
      options: optionsArr,
      status,
      error: err ? String(err?.message ?? err) : "",
    };

    console.log(`[COMMAND_LOG] ${safeJsonStringify(entry)}`);
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(COMMAND_LOG_PATH, `${safeJsonStringify(entry)}\n`, "utf8");
  } catch (e) {
    console.error("❌ Failed to write command log:", e);
  }
}

/**
 * Get current date/time formatted for Sao Paulo.
 * @returns {string}
 */
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

/**
 * Read and normalize Google credentials from environment.
 * @returns {{client_email: string, private_key: string}}
 */
function getGoogleCredsFromEnv() {
  const b64 = process.env.GOOGLE_CREDS_B64;
  if (!b64) {
    throw new Error("Missing env GOOGLE_CREDS_B64 (base64 of credentials.json).");
  }

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(jsonStr);

  if (typeof creds.private_key === "string") {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  return creds;
}

/**
 * Parse BR or ISO date/time strings into a Date in -03:00.
 * @param {string | number | null | undefined} value
 * @returns {Date | null}
 */
function parseBrazilianDateTime(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const brMatch = trimmed.match(
    /(\d{2})\/(\d{2})\/(\d{4})(?:[^\d]*(\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (brMatch) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] = brMatch;
    const isoBr = `${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`;
    const brDate = new Date(isoBr);
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

/**
 * Format a duration in milliseconds into a day-based string.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms <= 0) return "0 dias";
  const days = Math.ceil(ms / MS_PER_DAY);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

/**
 * Normalize player cell content to a lowercase name.
 * @param {string | null | undefined} value
 * @returns {string}
 */
function normalizePlayerCell(value) {
  if (!value) return "";
  const part = String(value).split("-")[0].trim();
  return part.toLowerCase();
}

/**
 * Check if the cell indicates the player was paid.
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
function isPlayerCellPaid(value) {
  if (!value) return false;
  return String(value).toLowerCase().includes("pago");
}

/**
 * Build preview text and suffix for long lists.
 * @param {string[]} lines
 * @param {number} previewLimit
 * @param {(extra: number) => string} suffixTemplate
 * @returns {{preview: string, suffix: string}}
 */
function buildPreview(lines, previewLimit, suffixTemplate) {
  const preview = lines.slice(0, previewLimit).join("\n");
  const extra = lines.length - previewLimit;
  const suffix = extra > 0 ? suffixTemplate(extra) : "";
  return { preview, suffix };
}

/**
 * Load or create a Google Sheet and ensure header formatting.
 * @param {string} title
 * @param {string[]} headers
 * @returns {Promise<import("google-spreadsheet").GoogleSpreadsheetWorksheet>}
 */
async function getSheet(title, headers) {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

  const creds = getGoogleCredsFromEnv();
  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key,
  });
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[title];

  if (!sheet) {
    sheet = await doc.addSheet({
      title,
      headerValues: headers,
    });
  } else {
    await sheet.loadHeaderRow();
    const ok = sheet.headerValues?.join("|") === headers.join("|");
    if (!ok) await sheet.setHeaderRow(headers);
  }

  const lastColLetter = String.fromCharCode(65 + headers.length - 1);
  await sheet.loadCells(`A1:${lastColLetter}1`);

  for (let i = 0; i < headers.length; i++) {
    const cell = sheet.getCell(0, i);
    cell.textFormat = { foregroundColor: HEADER_FG, bold: true };
    cell.backgroundColor = HEADER_BG;
    cell.horizontalAlignment = "CENTER";
  }

  await sheet.saveUpdatedCells();
  return sheet;
}

/**
 * Handle /arma_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleArmaArch(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);

  const arma = normalizeArchWeaponValue(
    getRequiredOptionAny(interaction, ["arch_weapon", "arma_arch"])
  );

  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  const rows = await sheet.getRows();
  const hasExisting = rows.some(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );

  if (hasExisting) {
    const userWeapons = rows
      .filter((row) => (row.DiscordUserId || "").trim() === interaction.user.id)
      .map((row) => row.Arma)
      .filter(Boolean)
      .map((value) => normalizeArchWeaponValue(value))
      .filter(Boolean);
    const weaponList = userWeapons.length
      ? `\nRegistered weapon(s): ${userWeapons.map((weapon) => formatArchWeaponDisplay(weapon)).join(", ")}`
      : "";
    return interaction.editReply(
      tr(
        interaction,
        "⚠️ Você já possui uma arma de Archboss registrada. Remova com `/remover_arch` ou `/remove_arch` para adicionar outra." +
          (userWeapons.length
            ? `\nArma(s) registrada(s): ${userWeapons.map((weapon) => formatArchWeaponDisplay(weapon)).join(", ")}`
            : ""),
        "⚠️ You already have an Archboss weapon registered. Remove it with `/remove_arch` or `/remover_arch` to add another one." +
          weaponList
      )
    );
  }

  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Arma: arma,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(
    tr(
      interaction,
      `✅ Registrado!\nNick: **${nick}**\nArma Archboss: **${formatArchWeaponDisplay(arma)}**`,
      `✅ Registered!\nNickname: **${nick}**\nArchboss weapon: **${formatArchWeaponDisplay(arma)}**`
    )
  );
}

/**
 * Handle /listar_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleListarArch(interaction) {
  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );

  if (!userRows.length) {
    return interaction.editReply(
      tr(
        interaction,
        "📭 Você ainda não tem armas de Archboss registradas.",
        "📭 You don't have any registered Archboss weapons yet."
      )
    );
  }

  const lines = userRows.map(
    (row, idx) =>
      tr(
        interaction,
        `${idx + 1}. Nick: ${row.Nick} --- Arma: ${formatArchWeaponDisplay(row.Arma)}${row.Data ? ` --- Registrado em ${row.Data}` : ""}`,
        `${idx + 1}. Nickname: ${row.Nick} --- Weapon: ${formatArchWeaponDisplay(row.Arma)}${row.Data ? ` --- Registered at ${row.Data}` : ""}`
      )
  );

  const { preview, suffix } = buildPreview(lines, 15, (extra) =>
    tr(interaction, `\n... e mais ${extra} registro(s).`, `\n... and ${extra} more record(s).`)
  );

  return interaction.editReply(
    tr(
      interaction,
      `📋 Seus registros na lista de desejos:\n${preview}${suffix}`,
      `📋 Your registered wishlist entries:\n${preview}${suffix}`
    )
  );
}

/**
 * Handle /remover_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleRemoverArch(interaction) {
  const arma = normalizeArchWeaponValue(
    getRequiredOptionAny(interaction, ["arch_weapon", "arma_arch"])
  );

  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      normalizeArchWeaponValue(row.Arma) === arma
  );

  if (!targetRow) {
    return interaction.editReply(
      tr(
        interaction,
        "⚠️ Não encontrei esse item na sua lista de desejos.",
        "⚠️ I couldn't find this item in your wishlist."
      )
    );
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await targetRow.delete();

  return interaction.editReply(
    tr(
      interaction,
      `🗑️ Removido!\nNick: **${nick}**\nArma removida: **${formatArchWeaponDisplay(arma)}**`,
      `🗑️ Removed!\nNickname: **${nick}**\nRemoved weapon: **${formatArchWeaponDisplay(arma)}**`
    )
  );
}

/**
 * Handle /fila_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleFilaArch(interaction) {
  const item = normalizeArchWeaponValue(
    getRequiredOptionAny(interaction, ["arch_weapon", "item"])
  );

  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  const rows = await sheet.getRows();

  const targetItem = normalizeQueueItemName(item);
  const filtered = rows
    .filter((row) => normalizeQueueItemName(row.Arma) === targetItem)
    .map((row) => ({
      row,
      parsedDate: parseBrazilianDateTime(row.Data) || new Date(0),
    }))
    .sort((a, b) => {
      if (a.parsedDate.getTime() !== b.parsedDate.getTime()) {
        return a.parsedDate.getTime() - b.parsedDate.getTime();
      }
      return (a.row.rowNumber || 0) - (b.row.rowNumber || 0);
    });

  if (!filtered.length) {
    return interaction.editReply(
      tr(
        interaction,
        `📭 Nenhum jogador na fila de **${formatArchWeaponDisplay(item)}** na aba ${ARCH_SHEET_TITLE}.`,
        `📭 No players in queue for **${formatArchWeaponDisplay(item)}** in sheet ${ARCH_SHEET_TITLE}.`
      )
    );
  }

  const lines = filtered.map(({ row }) => {
    const nick = row.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
    const registro = row.Data
      ? tr(interaction, ` • Registrado em ${row.Data}`, ` • Registered at ${row.Data}`)
      : "";
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    return `- ${nick}${mention}${registro}`;
  });
  const { preview, suffix } = buildPreview(lines, 25, (extra) =>
    tr(interaction, `\n... e mais ${extra} jogador(es).`, `\n... and ${extra} more player(s).`)
  );

  return interaction.editReply(
    tr(
      interaction,
      `📜 Fila de **${formatArchWeaponDisplay(item)}** (${filtered.length} jogadores):\n${preview}${suffix}\n\n⚠️ Essa lista mostra apenas quem colocou a arma na wishlist; não é necessariamente a ordem de prioridade. ⚠️`,
      `📜 Queue for **${formatArchWeaponDisplay(item)}** (${filtered.length} players):\n${preview}${suffix}\n\n⚠️ This list only shows who added the weapon to the wishlist; it is not necessarily the priority order. ⚠️`
    )
  );
}

/**
 * Handle /item command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleItem(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const item = getRequiredOption(interaction, "item");

  const sheet = await getSheet("LISTA DESEJO ITEM", ["Data", "Nick", "Item"]);
  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
  });

  return interaction.editReply(
    tr(
      interaction,
      `✅ Registrado!\nNick: **${nick}**\nItem: **${item}**`,
      `✅ Registered!\nNickname: **${nick}**\nItem: **${item}**`
    )
  );
}

/**
 * Handle /item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleItemRaro(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  const sheet = await getSheet(RARE_ITEM_SHEET_TITLE, RARE_ITEM_HEADERS);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );
  const targetIsWeapon = isRareWeapon(item);
  const targetIsArmor = isRareArmor(item);
  const existingWeapon = userRows
    .map((row) => (row.Item || "").trim())
    .find((name) => isRareWeapon(name));
  const userArmors = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isRareArmor(name));
  const userAccessories = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => name && !isRareWeapon(name) && !isRareArmor(name));

  if (targetIsWeapon && existingWeapon) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui uma arma rara registrada: **${existingWeapon}**. Remova com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outra.`,
        `⚠️ You already have a registered rare weapon: **${existingWeapon}**. Remove it with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  if (targetIsArmor && userArmors.length >= MAX_RARE_ARMORS_PER_USER) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui 1 armadura rara registrada: **${userArmors[0]}**. Remova com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outra.`,
        `⚠️ You already have 1 registered rare armor: **${userArmors[0]}**. Remove it with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  if (!targetIsWeapon && !targetIsArmor && userAccessories.length >= MAX_RARE_ACCESSORIES_PER_USER) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui ${MAX_RARE_ACCESSORIES_PER_USER} acessórios raros registrados. Remova um com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outro.`,
        `⚠️ You already have ${MAX_RARE_ACCESSORIES_PER_USER} registered rare accessories. Remove one with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(
    tr(
      interaction,
      `✅ Registrado!\nNick: **${nick}**\nItem raro: **${item}**`,
      `✅ Registered!\nNickname: **${nick}**\nRare item: **${item}**`
    )
  );
}

/**
 * Handle /remover_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleRemoverItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  const sheet = await getSheet(RARE_ITEM_SHEET_TITLE, RARE_ITEM_HEADERS);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Item || "").trim() === item
  );

  if (!targetRow) {
    return interaction.editReply(
      tr(
        interaction,
        "⚠️ Não encontrei esse item raro na sua lista de desejos.",
        "⚠️ I couldn't find this rare item in your wishlist."
      )
    );
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await targetRow.delete();

  return interaction.editReply(
    tr(
      interaction,
      `🗑️ Removido!\nNick: **${nick}**\nItem raro removido: **${item}**`,
      `🗑️ Removed!\nNickname: **${nick}**\nRemoved rare item: **${item}**`
    )
  );
}

/**
 * Handle /fila_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleFilaItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  const sheet = await getSheet(RARE_ITEM_SHEET_TITLE, RARE_ITEM_HEADERS);
  const rows = await sheet.getRows();

  const targetItem = normalizeQueueItemName(item);
  const filtered = rows
    .filter((row) => normalizeQueueItemName(row.Item) === targetItem)
    .map((row) => ({
      row,
      parsedDate: parseBrazilianDateTime(row.Data) || new Date(0),
    }))
    .sort((a, b) => {
      if (a.parsedDate.getTime() !== b.parsedDate.getTime()) {
        return a.parsedDate.getTime() - b.parsedDate.getTime();
      }
      return (a.row.rowNumber || 0) - (b.row.rowNumber || 0);
    });

  if (!filtered.length) {
    return interaction.editReply(
      tr(
        interaction,
        `📭 Nenhum jogador na fila do item raro **${item}** na aba ${RARE_ITEM_SHEET_TITLE}.`,
        `📭 No players in queue for rare item **${item}** in sheet ${RARE_ITEM_SHEET_TITLE}.`
      )
    );
  }

  const lines = filtered.map(({ row }) => {
    const nick = row.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
    const registro = row.Data
      ? tr(interaction, ` • Registrado em ${row.Data}`, ` • Registered at ${row.Data}`)
      : "";
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    return `- ${nick}${mention}${registro}`;
  });
  const { preview, suffix } = buildPreview(lines, 25, (extra) =>
    tr(interaction, `\n... e mais ${extra} jogador(es).`, `\n... and ${extra} more player(s).`)
  );

  return interaction.editReply(
    tr(
      interaction,
      `📜 Fila do item raro **${item}** (${filtered.length} jogadores):\n${preview}${suffix}\n\n⚠️ Essa lista mostra apenas quem colocou o item raro na wishlist; não é necessariamente a ordem de prioridade. ⚠️`,
      `📜 Queue for rare item **${item}** (${filtered.length} players):\n${preview}${suffix}\n\n⚠️ This list only shows who added the rare item to the wishlist; it is not necessarily the priority order. ⚠️`
    )
  );
}

/**
 * Handle /cooldown command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleCooldown(interaction) {
  const player = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const sheet = await getSheet(ARCH_HISTORY_SHEET_TITLE, ARCH_HISTORY_HEADERS);
  const rows = await sheet.getRows();
  const findLastRow = (predicate) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (predicate(rows[i])) return rows[i];
    }
    return null;
  };

  const targetLower = player.toLowerCase();
  let lastWin = findLastRow((row) => {
    const rowPlayer = (row.Player || "").trim();
    return rowPlayer && rowPlayer.toLowerCase() === targetLower;
  });

  if (!lastWin) {
    const discordId = String(interaction.user.id).trim();
    lastWin = findLastRow(
      (row) => String(row.DiscordUserId || "").trim() === discordId
    );
  }

  if (!lastWin) {
    return interaction.editReply(`✅ ${player} has no Archboss win records.`);
  }

  const dateValue = lastWin["Data/Hora"] || lastWin.Data || lastWin["Data Hora"];
  const lastDate = parseBrazilianDateTime(dateValue);

  if (!lastDate) {
    return interaction.editReply(
      "⚠️ I couldn't parse the date of the last record. Please check the spreadsheet."
    );
  }

  const cooldownDays = getCooldownDaysForDate(lastDate);
  const nextEligible = new Date(lastDate.getTime() + cooldownDays * MS_PER_DAY);
  const now = new Date();

  if (nextEligible <= now) {
    return interaction.editReply(
      `🟢 ${player} is eligible. Last weapon on ${lastDate.toLocaleDateString("en-US", {
        timeZone: "America/Sao_Paulo",
      })}.`
    );
  }

  const remaining = nextEligible.getTime() - now.getTime();
  const humanRemaining = formatDuration(remaining);

  return interaction.editReply(
    `⏳ ${humanRemaining} remaining for player **${player}** cooldown.\nLast weapon: **${
      lastWin["Item (Arma)"] || lastWin.Item || "not informed"
    }** on ${lastDate.toLocaleDateString("en-US", { timeZone: "America/Sao_Paulo" })}`
  );
}

/**
 * Handle /cooldown_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleCooldownItemRaro(interaction) {
  const player = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const sheet = await getSheet(RARE_ITEM_HISTORY_SHEET_TITLE, RARE_ITEM_HISTORY_HEADERS);
  const rows = await sheet.getRows();
  const findLastRow = (predicate) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (predicate(rows[i])) return rows[i];
    }
    return null;
  };

  const targetLower = player.toLowerCase();
  const discordId = String(interaction.user.id).trim();
  const matchesPlayer = (row) => {
    const rowPlayer = (row.Player || "").trim();
    if (rowPlayer && rowPlayer.toLowerCase() === targetLower) return true;
    return String(row.DiscordUserId || "").trim() === discordId;
  };
  const getItemName = (row) => row.Item || row["Item (Arma)"] || "";
  const lastWeaponWin = findLastRow(
    (row) => matchesPlayer(row) && isRareWeapon(getItemName(row))
  );
  const lastEquipWin = findLastRow(
    (row) => matchesPlayer(row) && getItemName(row) && !isRareWeapon(getItemName(row))
  );

  if (!lastWeaponWin && !lastEquipWin) {
    return interaction.editReply(
      `✅ ${player} has no rare item win records.`
    );
  }

  const now = new Date();
  const formatStatus = (label, lastWin) => {
    if (!lastWin) return `🟢 ${label}: eligible (no records).`;

    const dateValue = lastWin["Data/Hora"] || lastWin.Data || lastWin["Data Hora"];
    const lastDate = parseBrazilianDateTime(dateValue);
    if (!lastDate) {
      return `⚠️ ${label}: I couldn't parse the date of the last record.`;
    }

    const cooldownDays = getCooldownDaysForDate(lastDate);
    const nextEligible = new Date(lastDate.getTime() + cooldownDays * MS_PER_DAY);
    const itemName = getItemName(lastWin) || "not informed";
    const formattedDate = lastDate.toLocaleDateString("en-US", {
      timeZone: "America/Sao_Paulo",
    });

    if (nextEligible <= now) {
      return `🟢 ${label}: eligible. Last item: **${itemName}** on ${formattedDate}.`;
    }

    const remaining = nextEligible.getTime() - now.getTime();
    const humanRemaining = formatDuration(remaining);
    return `⏳ ${label}: ${humanRemaining} remaining.\nLast item: **${itemName}** on ${formattedDate}`;
  };

  const weaponStatus = formatStatus("Rare weapon", lastWeaponWin);
  const equipStatus = formatStatus("Rare item/equipment", lastEquipWin);

  return interaction.editReply(
    `${weaponStatus}\n${equipStatus}`
  );
}

/**
 * Handle autocomplete interactions for supported options.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleAutocomplete(interaction) {
  try {
    if (interaction.responded) return;
    if (!isAllowedChannel(interaction)) {
      await respondAutocompleteOnce(interaction, []);
      return;
    }

    const focused = interaction.options.getFocused(true);
    const q = String(focused.value || "").toLowerCase();

    const dataByOptionName = {
      arch_weapon: weapons,
      arma_arch: weapons,
      item: weapons,
      rare_item: rareItems,
      item_raro: rareItems,
    };

    const list = dataByOptionName[focused.name] || [];

    const results = list
      .filter((x) => {
        const display = formatArchWeaponDisplay(x);
        return x.toLowerCase().includes(q) || display.toLowerCase().includes(q);
      })
      .slice(0, 25)
      .map((x) => ({
        name:
          formatArchWeaponDisplay(x).length > 100
            ? formatArchWeaponDisplay(x).slice(0, 97) + "..."
            : formatArchWeaponDisplay(x),
        value: x,
      }));

    await respondAutocompleteOnce(interaction, results);
    return;
  } catch (err) {
    console.error("❌ Autocomplete error:", err);
    return;
  }
}

const commandHandlers = {
  weapon_arch: handleArmaArch,
  arch_weapon: handleArmaArch,
  arma_arch: handleArmaArch,
  list_arch: handleListarArch,
  listar_arch: handleListarArch,
  remove_arch: handleRemoverArch,
  remover_arch: handleRemoverArch,
  arch_queue: handleFilaArch,
  fila_arch: handleFilaArch,
  rare_item: handleItemRaro,
  item_raro: handleItemRaro,
  remove_rare_item: handleRemoverItemRaro,
  remover_item_raro: handleRemoverItemRaro,
  rare_item_queue: handleFilaItemRaro,
  fila_item_raro: handleFilaItemRaro,
  item: handleItem,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  await loadArchWeaponIconsFromGuild(client);
  await syncArchWeaponIconsToGuild(client);
  console.log("✅ Arch weapon icon sync complete.");
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (!isAllowedChannel(interaction)) {
    await appendCommandLog({
      interaction,
      status: "BLOCKED_CHANNEL",
      err: null,
    });

    return interaction.reply({
      content: tr(
        interaction,
        `❌ Este bot só pode ser usado no canal #${ALLOWED_CHANNEL_NAME}.`,
        `❌ This bot can only be used in #${ALLOWED_CHANNEL_NAME}.`
      ),
      ephemeral: true,
    });
  }

  let hasDeferred = false;
  try {
    await interaction.deferReply({
      ephemeral: true,
    });
    hasDeferred = true;

    const handler = commandHandlers[interaction.commandName];
    if (!handler) {
      await appendCommandLog({
        interaction,
        status: "UNKNOWN_COMMAND",
        err: null,
      });
      return interaction.editReply(
        tr(
          interaction,
          "❌ Comando não suportado por este bot.",
          "❌ This command is not supported by this bot."
        )
      );
    }

    const result = await handler(interaction);
    await appendCommandLog({
      interaction,
      status: "OK",
      err: null,
    });
    return result;
  } catch (err) {
    console.error("❌ Error while processing command:", err);
    const errorMsg = tr(
      interaction,
      "❌ Erro ao registrar. Veja os logs do bot.",
      "❌ Error while registering. Check bot logs."
    );
    await appendCommandLog({
      interaction,
      status: "ERROR",
      err,
    });

    if (interaction.replied) {
      return interaction.followUp({
        content: errorMsg,
        ephemeral: true,
      });
    }
    if (hasDeferred || interaction.deferred) {
      return interaction.editReply(errorMsg);
    }
    return interaction.reply({
      content: errorMsg,
      ephemeral: true,
    });
  }
});
client.login(process.env.DISCORD_TOKEN);
