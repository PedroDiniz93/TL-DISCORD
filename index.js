require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const fs = require("fs");

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 }; // azul escuro
const HEADER_FG = { red: 1, green: 1, blue: 1 }; // branco

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

  try {
    // responde rápido e evita timeout do Discord
    await interaction.deferReply({ ephemeral: true });


    if (interaction.commandName === "arma_arch") {
      const nick = interaction.options.getString("nick", true).trim();

      // ⚠️ o nome da option tem que ser EXATAMENTE "arma_arch" (igual no deploy-commands)
      const arma = interaction.options.getString("arma_arch", true).trim();

      const sheet = await getSheet("LISTA DESEJO ARCH", ["Data", "Nick", "Arma"]);
      await sheet.addRow({
        Data: nowBrasilia(),
        Nick: nick,
        Arma: arma,
      });

      return interaction.editReply(`✅ Registrado!\nNick: **${nick}**\nArma: **${arma}**`);
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

    // se cair aqui, é porque você executou um comando que o bot não trata
    return interaction.editReply("❌ Comando não suportado por este bot.");
  } catch (err) {
    console.error("❌ Erro ao processar comando:", err);
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply("❌ Erro ao registrar. Veja os logs do bot.");
    }
    return interaction.reply({ content: "❌ Erro ao processar o comando.", ephemeral: true });
  }
});


client.login(process.env.DISCORD_TOKEN);

