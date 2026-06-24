const { buildMyItemsReply } = require("../responses");
const { getUserWishlistRows } = require("../wishlist-repository");

async function buildMyItemsForInteraction(interaction) {
  const { archRows, rareItemRows } = await getUserWishlistRows(interaction.user.id);

  return buildMyItemsReply({
    interaction,
    archRows,
    rareItemRows,
  });
}

async function handleMyItems(interaction) {
  return interaction.editReply(await buildMyItemsForInteraction(interaction));
}

module.exports = {
  buildMyItemsForInteraction,
  handleMyItems,
};
