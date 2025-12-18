require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const fs = require("fs");

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 }; // azul escuro
const HEADER_FG = { red: 1, green: 1, blue: 1 }; // branco

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

  /**
   * /arma  -> salva em "LISTA DESEJO ARCH"
   */
  if (interaction.commandName === "arma") {
    const nick = interaction.options.getString("nick", true).trim();
    const arma = interaction.options.getString("arma", true).trim();

    try {
      await interaction.reply({
        content: "📝 Registrando na planilha…",
        ephemeral: true,
      });

      const sheet = await getSheet("LISTA DESEJO ARCH", ["Data", "Nick", "Arma"]);

      await sheet.addRow({
        Data: new Date().toLocaleString("pt-BR"),
        Nick: nick,
        Arma: arma,
      });

      await interaction.editReply(
        `✅ Registrado!\nNick: **${nick}**\nArma: **${arma}**`
      );
    } catch (err) {
      console.error(err);
      await interaction.editReply(
        "❌ Erro ao registrar. Verifique credenciais e acesso à planilha."
      );
    }
    return;
  }

  /**
   * /item -> salva em "LISTA DESEJO ITEM"
   */
  if (interaction.commandName === "item") {
    const nick = interaction.options.getString("nick", true).trim();
    const item = interaction.options.getString("item", true).trim();

    try {
      await interaction.reply({
        content: "📝 Registrando na planilha…",
        ephemeral: true,
      });

      const sheet = await getSheet("LISTA DESEJO ITEM", ["Data", "Nick", "Item"]);

      await sheet.addRow({
        Data: new Date().toLocaleString("pt-BR"),
        Nick: nick,
        Item: item,
      });

      await interaction.editReply(
        `✅ Registrado!\nNick: **${nick}**\nItem: **${item}**`
      );
    } catch (err) {
      console.error(err);
      await interaction.editReply(
        "❌ Erro ao registrar. Verifique credenciais e acesso à planilha."
      );
    }
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);

