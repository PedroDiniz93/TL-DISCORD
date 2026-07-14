const { stripLeadingItemEmoji } = require("../items");
const {
  buildEmptyItemReply,
  buildRareItemQueueReply,
  buildRareItemWishlistReply,
  buildRegisteredItemReply,
  buildRemoveItemAction,
  buildRemovedItemReply,
  buildWarningItemReply,
} = require("../responses");
const { appendLootHistoryLog } = require("../logging");
const { resolveNicknameForRegistration } = require("../nicknames");
const { enrichQueueRowsWithDiscordDisplayNames } = require("../discord-members");
const { getRulesForInteraction, isItemEnabled } = require("../guild-settings");
const { findItemByName, getItemCategoryKey } = require("../item-catalog");
const {
  addRareItemRegistration,
  deleteRareItemRow,
  getQueueRows,
  getUserRareItemRows,
} = require("../wishlist-repository");
const {
  getOptionalOptionAny,
  getRequiredOptionAny,
  normalizeQueueItemName,
  nowBrasilia,
  tr,
} = require("../utils");

async function handleItemRaro(interaction) {
  const nick = getOptionalOptionAny(interaction, ["nickname", "nick"]);
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  return interaction.editReply(
    await registerRareItem({
      interaction,
      nick,
      item,
    })
  );
}

async function registerRareItem({ interaction, nick, item }) {
  const rules = await getRulesForInteraction(interaction);
  const catalogItem = await findItemByName(interaction.guildId, "rare", item);
  if (!catalogItem) {
    return buildWarningItemReply({
      interaction,
      itemName: item,
      title: tr(interaction, "⚠️ Item indisponível", "⚠️ Item unavailable"),
      description: tr(
        interaction,
        "Esse item raro não está disponível para registro.",
        "This rare item is not available for registration."
      ),
    });
  }

  if (!isItemEnabled(rules, "rare", catalogItem.name)) {
    return buildWarningItemReply({
      interaction,
      itemName: item,
      title: tr(interaction, "⚠️ Item desabilitado", "⚠️ Item disabled"),
      description: tr(
        interaction,
        "Esse item raro nao esta habilitado para registros nesta guild.",
        "This rare item is not enabled for registrations in this guild."
      ),
    });
  }

  const itemForSheet = stripLeadingItemEmoji(catalogItem.name);
  const userRows = await getUserRareItemRows(interaction.user.id);
  const targetCategoryKey = getItemCategoryKey(catalogItem);
  const categoryLimit = Number(catalogItem.limitPerUser || 1);
  const userRowsInCategory = await getUserRowsInRareCategory(interaction.guildId, userRows, targetCategoryKey);

  if (userRowsInCategory.length >= categoryLimit) {
    return buildWarningItemReply({
      interaction,
      itemName: userRowsInCategory[0]?.Item || itemForSheet,
      title: tr(interaction, "⚠️ Limite de categoria", "⚠️ Category limit reached"),
      description: tr(
        interaction,
        `Voce ja possui ${categoryLimit} item(ns) nessa categoria. Remova um com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outro.`,
        `You already have ${categoryLimit} item(s) in this category. Remove one with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      ),
      fields: [
        {
          name: tr(interaction, "Itens registrados", "Registered items"),
          value: userRowsInCategory.map((row) => row.Item).join("\n"),
          inline: false,
        },
      ],
      components: [buildRemoveItemAction(interaction, "rare")],
    });
  }

  const nickname = await resolveNicknameForRegistration(interaction, nick);
  if (nickname.reply) return nickname.reply;

  await addRareItemRegistration({
    registeredAt: nowBrasilia(),
    nick: nickname.nick,
    item: itemForSheet,
    discordUserId: interaction.user.id,
  });
  await appendLootHistoryLog({
    interaction,
    action: "add",
    itemType: "rare",
    item: itemForSheet,
    nick: nickname.nick,
  });

  return buildRegisteredItemReply({
    interaction,
    nick: nickname.nick,
    itemName: itemForSheet,
    itemLabel: {
      pt: "Item raro",
      en: "Rare item",
    },
    type: "rare",
  });
}

async function getUserRowsInRareCategory(guildId, rows, categoryKey) {
  const matches = [];
  for (const row of rows) {
    const catalogItem = await findItemByName(guildId, "rare", row.Item);
    if (catalogItem && getItemCategoryKey(catalogItem) === categoryKey) {
      matches.push(row);
    }
  }
  return matches;
}

async function buildRemoverItemRaroReply(interaction, item) {
  const rows = await getUserRareItemRows(interaction.user.id);
  const targetItem = normalizeQueueItemName(item);
  const targetRow = rows.find(
    (row) => normalizeQueueItemName(row.Item) === targetItem
  );

  if (!targetRow) {
    return buildWarningItemReply({
      interaction,
      itemName: item,
      title: tr(interaction, "⚠️ Item não encontrado", "⚠️ Item not found"),
      description: tr(
        interaction,
        "Não encontrei esse item raro na sua lista de desejos.",
        "I couldn't find this rare item in your wishlist."
      ),
    });
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await deleteRareItemRow(targetRow);
  await appendLootHistoryLog({
    interaction,
    action: "remove",
    itemType: "rare",
    item,
    nick,
  });

  return buildRemovedItemReply({
    interaction,
    nick,
    itemName: item,
    itemLabel: {
      pt: "Item raro removido",
      en: "Removed rare item",
    },
  });
}

async function buildFilaItemRaroReply(interaction, item) {
  const filtered = await getQueueRows("rare", item);

  if (!filtered.length) {
    return buildEmptyItemReply({
      interaction,
      itemName: item,
      title: tr(interaction, "📭 Fila vazia", "📭 Empty queue"),
      description: tr(
        interaction,
        `Nenhum jogador na fila do item raro **${item}**.`,
        `No players in queue for rare item **${item}**.`
      ),
    });
  }

  const displayRows = await enrichQueueRowsWithDiscordDisplayNames(interaction, filtered);

  return buildRareItemQueueReply({
    interaction,
    itemName: item,
    rows: displayRows,
  });
}

async function buildListarItemRaroReply(interaction) {
  const userRows = await getUserRareItemRows(interaction.user.id);

  if (!userRows.length) {
    return buildEmptyItemReply({
      interaction,
      title: tr(interaction, "📭 Lista vazia", "📭 Empty wishlist"),
      description: tr(
        interaction,
        "Você ainda não tem itens raros registrados.",
        "You don't have any registered rare items yet."
      ),
    });
  }

  return buildRareItemWishlistReply({ interaction, rows: userRows });
}

async function handleRemoverItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);
  return interaction.editReply(await buildRemoverItemRaroReply(interaction, item));
}

async function handleFilaItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);
  return interaction.editReply(await buildFilaItemRaroReply(interaction, item));
}

module.exports = {
  buildFilaItemRaroReply,
  buildListarItemRaroReply,
  buildRemoverItemRaroReply,
  handleFilaItemRaro,
  handleItemRaro,
  handleRemoverItemRaro,
  registerRareItem,
};
