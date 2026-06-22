const { RARE_ITEM_SHEET } = require("../config");
const {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_ARMORS_PER_USER,
  isKnownRareItem,
  isRareArmor,
} = require("../items");
const {
  buildEmptyItemReply,
  buildRareItemQueueReply,
  buildRareItemWishlistReply,
  buildRegisteredItemReply,
  buildRemovedItemReply,
  buildWarningItemReply,
} = require("../responses");
const { getSheet } = require("../sheets");
const {
  getRequiredOptionAny,
  normalizeQueueItemName,
  nowBrasilia,
  parseBrazilianDateTime,
  tr,
} = require("../utils");

async function handleItemRaro(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);
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
  if (!isKnownRareItem(item)) {
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

  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );
  const targetIsArmor = isRareArmor(item);
  const userArmors = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isRareArmor(name));
  const userAccessories = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isKnownRareItem(name) && !isRareArmor(name));

  if (targetIsArmor && userArmors.length >= MAX_RARE_ARMORS_PER_USER) {
    return buildWarningItemReply({
      interaction,
      itemName: userArmors[0],
      title: tr(interaction, "⚠️ Limite de armadura", "⚠️ Armor limit reached"),
      description: tr(
        interaction,
        "Você já possui 1 armadura rara registrada. Remova com `/remover_item_raro` ou `/remove_rare_item` para adicionar outra.",
        "You already have 1 registered rare armor. Remove it with `/remove_rare_item` or `/remover_item_raro` to add another one."
      ),
      fields: [
        {
          name: tr(interaction, "Armadura registrada", "Registered armor"),
          value: userArmors[0],
          inline: false,
        },
      ],
    });
  }

  if (
    !targetIsArmor &&
    userAccessories.length >= MAX_RARE_ACCESSORIES_PER_USER
  ) {
    return buildWarningItemReply({
      interaction,
      itemName: userAccessories[0],
      title: tr(interaction, "⚠️ Limite de acessórios", "⚠️ Accessory limit reached"),
      description: tr(
        interaction,
        `Você já possui ${MAX_RARE_ACCESSORIES_PER_USER} acessórios raros registrados. Remova um com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outro.`,
        `You already have ${MAX_RARE_ACCESSORIES_PER_USER} registered rare accessories. Remove one with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      ),
      fields: [
        {
          name: tr(interaction, "Acessórios registrados", "Registered accessories"),
          value: userAccessories.join("\n"),
          inline: false,
        },
      ],
    });
  }

  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
    DiscordUserId: interaction.user.id,
  });

  return buildRegisteredItemReply({
    interaction,
    nick,
    itemName: item,
    itemLabel: {
      pt: "Item raro",
      en: "Rare item",
    },
    type: "rare",
  });
}

async function buildRemoverItemRaroReply(interaction, item) {
  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Item || "").trim() === item
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
  await targetRow.delete();

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
  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
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
    return buildEmptyItemReply({
      interaction,
      itemName: item,
      title: tr(interaction, "📭 Fila vazia", "📭 Empty queue"),
      description: tr(
        interaction,
        `Nenhum jogador na fila do item raro **${item}** na aba ${RARE_ITEM_SHEET.title}.`,
        `No players in queue for rare item **${item}** in sheet ${RARE_ITEM_SHEET.title}.`
      ),
    });
  }

  return buildRareItemQueueReply({
    interaction,
    itemName: item,
    rows: filtered,
  });
}

async function buildListarItemRaroReply(interaction) {
  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );

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
