require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const ARCH_SHEET_TITLE = "LISTA DESEJO ARCH";
const ARCH_HEADERS = ["Data", "Nick", "Arma", "DiscordUserId"];
const ARCH_HISTORY_SHEET_TITLE = "HISTORICO DE GANHO ARCH BOSS";
const ARCH_HISTORY_HEADERS = ["Data/Hora", "Player", "Item (Arma)"];
const ARCH_COOLDOWN_DAYS = 20;
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

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 }; // azul escuro
const HEADER_FG = { red: 1, green: 1, blue: 1 }; // branco

const ALLOWED_CHANNEL_ID = "1455974263906504763";

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

function getGoogleCredsFromEnv() {
  const b64 = process.env.GOOGLE_CREDS_B64;
  if (!b64) {
    throw new Error("Missing env GOOGLE_CREDS_B64 (base64 do credentials.json).");
  }

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(jsonStr);

  // garante que a private_key tenha quebras corretas (se vier com \n)
  if (typeof creds.private_key === "string") {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  return creds;
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

function formatDuration(ms) {
  if (ms <= 0) return "0 dias";
  const days = Math.ceil(ms / MS_PER_DAY);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

function normalizePlayerCell(value) {
  if (!value) return "";
  const part = String(value).split("-")[0].trim();
  return part.toLowerCase();
}

function isPlayerCellPaid(value) {
  if (!value) return false;
  return String(value).toLowerCase().includes("pago");
}

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

  // 🎨 Formatação do header (A1 até última coluna)
  const lastColLetter = String.fromCharCode(65 + headers.length - 1); // A, B, C...
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  let hasDeferred = false;
  try {
    // responde rápido e evita timeout do Discord
    await interaction.deferReply({ ephemeral: true });
    hasDeferred = true;

    if (interaction.commandName === "arma_arch") {
      const nick = interaction.options.getString("nick", true).trim();

      // ⚠️ o nome da option tem que ser EXATAMENTE "arma_arch" (igual no deploy-commands)
      const arma = interaction.options.getString("arma_arch", true).trim();

      const sheet = await getSheet(ARCH_SHEET_TITLE, ARCH_HEADERS);
      await sheet.addRow({
        Data: nowBrasilia(),
        Nick: nick,
        Arma: arma,
        DiscordUserId: interaction.user.id,
      });

      return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nArma: **${arma}**`);
    }

    if (interaction.commandName === "listar_arch") {
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

      const previewLimit = 15;
      const preview = lines.slice(0, previewLimit).join("\n");
      const suffix =
        lines.length > previewLimit
          ? `\n... e mais ${lines.length - previewLimit} registro(s).`
          : "";

      return interaction.editReply(`📋 Seus desejos registrados:\n${preview}${suffix}`);
    }

    if (interaction.commandName === "remover_arch") {
      const arma = interaction.options.getString("arma_arch", true).trim();

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

    if (interaction.commandName === "item") {
      const nick = interaction.options.getString("nick", true).trim();
      const item = interaction.options.getString("item", true).trim();

      const sheet = await getSheet("LISTA DESEJO ITEM", ["Data", "Nick", "Item"]);
      await sheet.addRow({
        Data: nowBrasilia(),
        Nick: nick,
        Item: item,
      });

      return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nItem: **${item}**`);
    }

    if (interaction.commandName === "meus_itens_a_venda") {
      const playerNick = interaction.options.getString("nick", true).trim();
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

      const previewLimit = 20;
      const preview = lines.slice(0, previewLimit).join("\n");
      const extraCount = lines.length - previewLimit;
      const suffix = extraCount > 0 ? `\n... e mais ${extraCount} item(ns).` : "";

      return interaction.editReply(
        `🛒 Itens à venda para **${playerNick}**:\n${preview}${suffix}`
      );
    }

    if (interaction.commandName === "minhas_vendas") {
      const playerNick = interaction.options.getString("nick", true).trim();
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
        const valorLiquido = row["Valor Líquido"] || row["Valor Liquido"] || "Valor não informado";
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
        const previewLimit = 15;
        const preview = entries.slice(0, previewLimit).join("\n");
        const extra = entries.length - previewLimit;
        const suffix = extra > 0 ? `\n... e mais ${extra} registro(s).` : "";
        return `**${label}:**\n${preview}${suffix}`;
      };

      const parts = [
        buildSection("Pendentes", pendentes),
        buildSection("Pagas", pagos),
      ];
      const totalsLine = `**Total:** Pendentes = ${totalPendente.toFixed(
        2
      )} | Pagos = ${totalPago.toFixed(2)}`;

      return interaction.editReply(
        `📑 Vendas do jogador **${playerNick}**:\n${parts.join("\n\n")}\n\n${totalsLine}`
      );
    }

    if (interaction.commandName === "cooldown") {
      const player = interaction.options.getString("nick", true).trim();
      const sheet = await getSheet(ARCH_HISTORY_SHEET_TITLE, ARCH_HISTORY_HEADERS);
      const rows = await sheet.getRows();
      let lastWin = null;

      const targetLower = player.toLowerCase();
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowPlayer = (rows[i].Player || "").trim();
        if (!rowPlayer) continue;
        if (rowPlayer.toLowerCase() === targetLower) {
          lastWin = rows[i];
          break;
        }
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

      const nextEligible = new Date(lastDate.getTime() + ARCH_COOLDOWN_DAYS * MS_PER_DAY);
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

    // se cair aqui, é porque você executou um comando que o bot não trata
    return interaction.editReply("❌ Comando não suportado por este bot.");
  } catch (err) {
    console.error("❌ Erro ao processar comando:", err);
    const errorMsg = "❌ Erro ao registrar. Veja os logs do bot.";

    if (interaction.replied) {
      return interaction.followUp({ content: errorMsg, ephemeral: true });
    }
    if (hasDeferred || interaction.deferred) {
      return interaction.editReply(errorMsg);
    }
    return interaction.reply({ content: errorMsg, ephemeral: true });
  }
});
client.login(process.env.DISCORD_TOKEN);
