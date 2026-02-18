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
const ARCH_COOLDOWN_DAYS = 20;
const ARCH_COOLDOWN_DAYS_NEW = 10;
const ARCH_COOLDOWN_CUTOFF_MONTH = 1; // February (0-based)
const ARCH_COOLDOWN_CUTOFF_DAY = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ITEMS_SHEET_TITLE = "ITENS_A_VENDA";
const ITEMS_SHEET_HEADERS = [
  "VENDA_ID",
  "Data",
  "Item",
  "Valor Bruto",
  "PT",
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4",
  "Player 5",
  "Player 6",
  "Observação",
];
const ITEM_PLAYER_COLUMNS = [
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4",
  "Player 5",
  "Player 6",
];
const LOG_DIR = path.join(__dirname, "logs");
const COMMAND_LOG_PATH = path.join(LOG_DIR, "commands.log");
const SALES_SHEET_TITLE = "VENDAS";
const SALES_SHEET_HEADERS = [
  "VENDA_ID",
  "Data",
  "Item",
  "PT",
  "Valor Bruto",
  "Valor Líquido",
  "Valor PT",
  "Valor Staff",
  "Valor por Player",
  "Qtd Players",
  "Player 1",
  "Player 2",
  "Player 3",
  "Player 4",
  "Player 5",
  "Player 6",
];

const weapons = [
  "🗡️ Espadão do Cordy",
  "🗡️ Espadão do Tevent",
  "🛡️ Espada e Escudo da Deluznoa",
  "🛡️ Espada e Escudo da Belandir",
  "⚔️ Adaga da Deluznoa",
  "⚔️ Adaga do Tevent",
  "🎯 Balestra do Cordy",
  "🎯 Balestra da Belandir",
  "🏹 Arco do Tevent",
  "🏹 Arco da Deluznoa",
  "⚡ Cajado da Deluznoa",
  "⚡ Cajado da Belandir",
  "🪄 Varinha do Tevent",
  "🪄 Varinha do Cordy",
  "🗡️ Lança da Deluznoa",
  "🗡️ Lança da Belandir",
  "🔮 Orb do Tevent",
  "🔮 Orb do Cordy",
];

const rareItems = [
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
];

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 };
const HEADER_FG = { red: 1, green: 1, blue: 1 };

const ALLOWED_CHANNEL_NAME = "🎢planilha-arch-boss";

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
 * Pick cooldown days based on cutoff date.
 * @param {Date} lastDate
 * @returns {number}
 */
function getCooldownDaysForDate(lastDate) {
  const cutoff = new Date(
    lastDate.getFullYear(),
    ARCH_COOLDOWN_CUTOFF_MONTH,
    ARCH_COOLDOWN_CUTOFF_DAY
  );
  return lastDate >= cutoff ? ARCH_COOLDOWN_DAYS_NEW : ARCH_COOLDOWN_DAYS;
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
    throw new Error("Missing env GOOGLE_CREDS_B64 (base64 do credentials.json).");
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
  const nick = getRequiredOption(interaction, "nick");

  const arma = getRequiredOption(interaction, "arma_arch");

  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Arma: arma,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nArma: **${arma}**`);
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
      "📭 Você ainda não tem armas registradas na lista de desejos."
    );
  }

  const lines = userRows.map(
    (row, idx) =>
      `${idx + 1}. Nick: ${row.Nick} --- Arma: ${row.Arma}${
        row.Data ? ` --- Registrado em ${row.Data}` : ""
      }`
  );

  const { preview, suffix } = buildPreview(lines, 15, (extra) =>
    `\n... e mais ${extra} registro(s).`
  );

  return interaction.editReply(`📋 Seus desejos registrados:\n${preview}${suffix}`);
}

/**
 * Handle /remover_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleRemoverArch(interaction) {
  const arma = getRequiredOption(interaction, "arma_arch");

  const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Arma || "").trim() === arma
  );

  if (!targetRow) {
    return interaction.editReply("⚠️ Não encontrei esse item na sua lista de desejos.");
  }

  const nick = targetRow.Nick || "Nick não informado";
  await targetRow.delete();

  return interaction.editReply(
    `🗑️ Removido!\nNick: **${nick}**\nArma removida: **${arma}**`
  );
}

/**
 * Handle /fila_arch command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleFilaArch(interaction) {
  const item = getRequiredOption(interaction, "item");

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
      `📭 Nenhum jogador na fila da arma **${item}** na aba ${ARCH_SHEET_TITLE}.`
    );
  }

  const lines = filtered.map(({ row }) => {
    const nick = row.Nick || "Nick não informado";
    const registro = row.Data ? ` • Registrado em ${row.Data}` : "";
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    return `- ${nick}${mention}${registro}`;
  });
  const { preview, suffix } = buildPreview(lines, 25, (extra) =>
    `\n... e mais ${extra} jogador(es).`
  );

  return interaction.editReply(
    `📜 Fila da arma **${item}** (${filtered.length} jogadores):\n${preview}${suffix}\n\n` +
      "⚠️ Essa listagem é apenas para saber quem colocou a arma na lista de desejo; " +
      "não necessariamente é a ordem prioritária. ⚠️"
  );
}

/**
 * Handle /item command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleItem(interaction) {
  const nick = getRequiredOption(interaction, "nick");
  const item = getRequiredOption(interaction, "item");

  const sheet = await getSheet("LISTA DESEJO ITEM", ["Data", "Nick", "Item"]);
  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
  });

  return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nItem: **${item}**`);
}

/**
 * Handle /item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleItemRaro(interaction) {
  const nick = getRequiredOption(interaction, "nick");
  const item = getRequiredOption(interaction, "item_raro");

  const sheet = await getSheet(RARE_ITEM_SHEET_TITLE, RARE_ITEM_HEADERS);
  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nItem raro: **${item}**`);
}

/**
 * Handle /remover_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleRemoverItemRaro(interaction) {
  const item = getRequiredOption(interaction, "item_raro");

  const sheet = await getSheet(RARE_ITEM_SHEET_TITLE, RARE_ITEM_HEADERS);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Item || "").trim() === item
  );

  if (!targetRow) {
    return interaction.editReply("⚠️ Não encontrei esse item raro na sua lista de desejos.");
  }

  const nick = targetRow.Nick || "Nick não informado";
  await targetRow.delete();

  return interaction.editReply(
    `🗑️ Removido!\nNick: **${nick}**\nItem raro removido: **${item}**`
  );
}

/**
 * Handle /fila_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleFilaItemRaro(interaction) {
  const item = getRequiredOption(interaction, "item_raro");

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
      `📭 Nenhum jogador na fila do item raro **${item}** na aba ${RARE_ITEM_SHEET_TITLE}.`
    );
  }

  const lines = filtered.map(({ row }) => {
    const nick = row.Nick || "Nick não informado";
    const registro = row.Data ? ` • Registrado em ${row.Data}` : "";
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    return `- ${nick}${mention}${registro}`;
  });
  const { preview, suffix } = buildPreview(lines, 25, (extra) =>
    `\n... e mais ${extra} jogador(es).`
  );

  return interaction.editReply(
    `📜 Fila do item raro **${item}** (${filtered.length} jogadores):\n${preview}${suffix}\n\n` +
      "⚠️ Essa listagem é apenas para saber quem colocou o item raro na lista de desejo; " +
      "não necessariamente é a ordem prioritária. ⚠️"
  );
}

/**
 * Handle /meus_itens_a_venda command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleMeusItensAVenda(interaction) {
  const playerNick = getRequiredOption(interaction, "nick");
  const targetLower = playerNick.toLowerCase();

  const sheet = await getSheet(ITEMS_SHEET_TITLE, ITEMS_SHEET_HEADERS);
  const rows = await sheet.getRows();
  const playerRows = rows.filter((row) =>
    ITEM_PLAYER_COLUMNS.some((col) => {
      const cell = row[col];
      return normalizePlayerCell(cell) === targetLower && !isPlayerCellPaid(cell);
    })
  );

  if (!playerRows.length) {
    return interaction.editReply(
      `📭 ${playerNick} não possui itens listados em ${ITEMS_SHEET_TITLE.replace(/_/g, " ")}.`
    );
  }

  const lines = playerRows.map((row, idx) => {
    const itemName = row.Item || row["Item (Arma)"] || "Item sem nome";
    const valor = row["Valor Bruto"] || row["Valor"] || "Valor não informado";
    const vendaId = row.VENDA_ID || row["VENDA_ID"] || "?";
    return `${idx + 1}. ID ${vendaId} — ${itemName} • Valor: ${valor}`;
  });

  const { preview, suffix } = buildPreview(lines, 20, (extraCount) =>
    `\n... e mais ${extraCount} item(ns).`
  );

  return interaction.editReply(
    `🛒 Itens à venda para **${playerNick}**:\n${preview}${suffix}`
  );
}

/**
 * Handle /minhas_vendas command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleMinhasVendas(interaction) {
  const playerNick = getRequiredOption(interaction, "nick");
  const targetLower = playerNick.toLowerCase();

  const sheet = await getSheet(SALES_SHEET_TITLE, SALES_SHEET_HEADERS);
  const rows = await sheet.getRows();

  const vendasDoPlayer = rows.filter((row) =>
    ITEM_PLAYER_COLUMNS.some((col) => normalizePlayerCell(row[col]) === targetLower)
  );

  if (!vendasDoPlayer.length) {
    return interaction.editReply(`📭 ${playerNick} não possui vendas registradas.`);
  }

  const pagos = [];
  const pendentes = [];
  let totalPago = 0;
  let totalPendente = 0;

  for (const row of vendasDoPlayer) {
    const wasPaid = ITEM_PLAYER_COLUMNS.some(
      (col) =>
        normalizePlayerCell(row[col]) === targetLower && isPlayerCellPaid(row[col])
    );

    const vendaId = row.VENDA_ID || row["VENDA_ID"] || "?";
    const itemName = row.Item || "Item não informado";
    const valorPorPlayer = row["Valor por Player"] || row["Valor Player"] || "-";
    const dataVenda = row.Data || row["Data/Hora"] || row["Data Venda"] || "";

    const entry = `ID ${vendaId} — ${itemName} • Valor por Player: ${valorPorPlayer}${
      dataVenda ? ` • Data: ${dataVenda}` : ""
    }`;

    const perPlayerNumeric = Number(
      String(valorPorPlayer).replace(/[^\d,-]/g, "").replace(".", "").replace(",", ".")
    );

    if (wasPaid) {
      pagos.push(entry);
      if (!Number.isNaN(perPlayerNumeric)) totalPago += perPlayerNumeric;
    } else {
      pendentes.push(entry);
      if (!Number.isNaN(perPlayerNumeric)) totalPendente += perPlayerNumeric;
    }
  }

  const buildSection = (label, entries) => {
    if (!entries.length) return `**${label}:** nenhum`;
    const { preview, suffix } = buildPreview(entries, 15, (extra) =>
      `\n... e mais ${extra} registro(s).`
    );
    return `**${label}:**\n${preview}${suffix}`;
  };

  const parts = [buildSection("Pendentes", pendentes), buildSection("Pagas", pagos)];
  const totalsLine = `**Total:** Pendentes = ${totalPendente.toFixed(
    2
  )} | Pagos = ${totalPago.toFixed(2)}`;

  return interaction.editReply(
    `📑 Vendas do jogador **${playerNick}**:\n${parts.join("\n\n")}\n\n${totalsLine}`
  );
}

/**
 * Handle /cooldown command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleCooldown(interaction) {
  const player = getRequiredOption(interaction, "nick");
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
    return interaction.editReply(`✅ ${player} não possui registros de ganho de Archboss.`);
  }

  const dateValue = lastWin["Data/Hora"] || lastWin.Data || lastWin["Data Hora"];
  const lastDate = parseBrazilianDateTime(dateValue);

  if (!lastDate) {
    return interaction.editReply(
      "⚠️ Não consegui interpretar a data do último registro. Verifique a planilha."
    );
  }

  const cooldownDays = getCooldownDaysForDate(lastDate);
  const nextEligible = new Date(lastDate.getTime() + cooldownDays * MS_PER_DAY);
  const now = new Date();

  if (nextEligible <= now) {
    return interaction.editReply(
      `🟢 ${player} está liberado. Última arma em ${lastDate.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })}.`
    );
  }

  const remaining = nextEligible.getTime() - now.getTime();
  const humanRemaining = formatDuration(remaining);

  return interaction.editReply(
    `⏳ Restam ${humanRemaining} para o cooldown do jogador **${player}** acabar.\nÚltima arma: **${
      lastWin["Item (Arma)"] || lastWin.Item || "não informado"
    }** em ${lastDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
  );
}

/**
 * Handle /cooldown_item_raro command.
 * @param {object} interaction
 * @returns {Promise<void>}
 */
async function handleCooldownItemRaro(interaction) {
  const player = getRequiredOption(interaction, "nick");
  const sheet = await getSheet(RARE_ITEM_HISTORY_SHEET_TITLE, RARE_ITEM_HISTORY_HEADERS);
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
    return interaction.editReply(
      `✅ ${player} não possui registros de ganho de item raro.`
    );
  }

  const dateValue = lastWin["Data/Hora"] || lastWin.Data || lastWin["Data Hora"];
  const lastDate = parseBrazilianDateTime(dateValue);

  if (!lastDate) {
    return interaction.editReply(
      "⚠️ Não consegui interpretar a data do último registro. Verifique a planilha."
    );
  }

  const cooldownDays = getCooldownDaysForDate(lastDate);
  const nextEligible = new Date(lastDate.getTime() + cooldownDays * MS_PER_DAY);
  const now = new Date();

  if (nextEligible <= now) {
    return interaction.editReply(
      `🟢 ${player} está liberado. Último item raro em ${lastDate.toLocaleDateString(
        "pt-BR",
        { timeZone: "America/Sao_Paulo" }
      )}.`
    );
  }

  const remaining = nextEligible.getTime() - now.getTime();
  const humanRemaining = formatDuration(remaining);

  return interaction.editReply(
    `⏳ Restam ${humanRemaining} para o cooldown do jogador **${player}** acabar.\nÚltimo item raro: **${
      lastWin.Item || lastWin["Item (Arma)"] || "não informado"
    }** em ${lastDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
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
      arma_arch: weapons,
      item: weapons,
      item_raro: rareItems,
    };

    const list = dataByOptionName[focused.name] || [];

    const results = list
      .filter((x) => x.toLowerCase().includes(q))
      .slice(0, 25)
      .map((x) => ({
        name: x.length > 100 ? x.slice(0, 97) + "..." : x,
        value: x,
      }));

    await respondAutocompleteOnce(interaction, results);
    return;
  } catch (err) {
    console.error("❌ Erro no autocomplete:", err);
    return;
  }
}

const commandHandlers = {
  arma_arch: handleArmaArch,
  listar_arch: handleListarArch,
  remover_arch: handleRemoverArch,
  fila_arch: handleFilaArch,
  item: handleItem,
  item_raro: handleItemRaro,
  remover_item_raro: handleRemoverItemRaro,
  fila_item_raro: handleFilaItemRaro,
  meus_itens_a_venda: handleMeusItensAVenda,
  minhas_vendas: handleMinhasVendas,
  cooldown: handleCooldown,
  cooldown_item_raro: handleCooldownItemRaro,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
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
      content: `❌ Este bot só pode ser usado no canal #${ALLOWED_CHANNEL_NAME}.`,
      flags: InteractionResponseFlags.Ephemeral,
    });
  }

  let hasDeferred = false;
  try {
    await interaction.deferReply({
      flags: InteractionResponseFlags.Ephemeral,
    });
    hasDeferred = true;

    const handler = commandHandlers[interaction.commandName];
    if (!handler) {
      await appendCommandLog({
        interaction,
        status: "UNKNOWN_COMMAND",
        err: null,
      });
      return interaction.editReply("❌ Comando não suportado por este bot.");
    }

    const result = await handler(interaction);
    await appendCommandLog({
      interaction,
      status: "OK",
      err: null,
    });
    return result;
  } catch (err) {
    console.error("❌ Erro ao processar comando:", err);
    const errorMsg = "❌ Erro ao registrar. Veja os logs do bot.";
    await appendCommandLog({
      interaction,
      status: "ERROR",
      err,
    });

    if (interaction.replied) {
      return interaction.followUp({
        content: errorMsg,
        flags: InteractionResponseFlags.Ephemeral,
      });
    }
    if (hasDeferred || interaction.deferred) {
      return interaction.editReply(errorMsg);
    }
    return interaction.reply({
      content: errorMsg,
      flags: InteractionResponseFlags.Ephemeral,
    });
  }
});
client.login(process.env.DISCORD_TOKEN);
