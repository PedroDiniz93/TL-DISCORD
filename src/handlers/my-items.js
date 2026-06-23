const { ARCH_SHEET, RARE_ITEM_SHEET } = require("../config");
const { buildMyItemsReply } = require("../responses");
const { getSheetRows } = require("../sheets");

async function buildMyItemsForInteraction(interaction) {
  const [archRows, rareItemRows] = await Promise.all([
    getSheetRows(ARCH_SHEET.title, ARCH_SHEET.headers),
    getSheetRows(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers),
  ]);
  const userId = interaction.user.id;

  return buildMyItemsReply({
    interaction,
    archRows: archRows.filter((row) => String(row.DiscordUserId || "").trim() === userId),
    rareItemRows: rareItemRows.filter(
      (row) => String(row.DiscordUserId || "").trim() === userId
    ),
  });
}

async function handleMyItems(interaction) {
  return interaction.editReply(await buildMyItemsForInteraction(interaction));
}

module.exports = {
  buildMyItemsForInteraction,
  handleMyItems,
};
