const { ARCH_SHEET, RARE_ITEM_SHEET } = require("./config");
const { getSheetRows } = require("./sheets");
const { parseBrazilianDateTime, tr } = require("./utils");
const { buildWarningItemReply } = require("./responses");

const NICKNAME_SOURCES = [
  {
    sheet: ARCH_SHEET,
    nickField: "Nick",
    dateField: "Data",
  },
  {
    sheet: RARE_ITEM_SHEET,
    nickField: "Nick",
    dateField: "Data",
  },
];

async function getLastNicknameForDiscordUser(discordUserId) {
  const userId = String(discordUserId || "").trim();
  if (!userId) return "";

  const sourceRows = await Promise.all(
    NICKNAME_SOURCES.map(async (source) => ({
      source,
      rows: await getSheetRows(source.sheet.title, source.sheet.headers),
    }))
  );

  return sourceRows
    .flatMap(({ source, rows }) =>
      rows
        .filter((row) => String(row.DiscordUserId || "").trim() === userId)
        .map((row) => ({
          nick: String(row[source.nickField] || "").trim(),
          parsedDate: parseBrazilianDateTime(row[source.dateField]) || new Date(0),
          rowNumber: row.rowNumber || 0,
        }))
    )
    .filter((entry) => entry.nick)
    .sort((a, b) => {
      if (a.parsedDate.getTime() !== b.parsedDate.getTime()) {
        return b.parsedDate.getTime() - a.parsedDate.getTime();
      }
      return b.rowNumber - a.rowNumber;
    })[0]?.nick || "";
}

async function resolveNicknameForRegistration(interaction, nick) {
  const typedNick = String(nick || "").trim();
  if (typedNick) {
    return {
      nick: typedNick,
      reply: null,
    };
  }

  const lastNick = await getLastNicknameForDiscordUser(interaction.user?.id);
  if (lastNick) {
    return {
      nick: lastNick,
      reply: null,
    };
  }

  return {
    nick: "",
    reply: buildWarningItemReply({
      interaction,
      title: tr(interaction, "⚠️ Nick obrigatório", "⚠️ Nick required"),
      description: tr(
        interaction,
        "Informe seu nick neste primeiro registro. Depois disso eu reutilizo o último nick salvo para você.",
        "Enter your nickname for this first registration. After that I reuse the last nickname saved for you."
      ),
    }),
  };
}

module.exports = {
  getLastNicknameForDiscordUser,
  resolveNicknameForRegistration,
};
