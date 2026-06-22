const { ARCH_SHEET, RARE_ITEM_SHEET } = require("../config");
const { buildMyItemsReply } = require("../responses");
const { getSheet } = require("../sheets");

async function buildMyItemsForInteraction(interaction) {
  const [archSheet, rareItemSheet] = await Promise.all([
    getSheet(ARCH_SHEET.title, ARCH_SHEET.headers),
    getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers),
  ]);
  const [archRows, rareItemRows] = await Promise.all([
    archSheet.getRows(),
    rareItemSheet.getRows(),
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
