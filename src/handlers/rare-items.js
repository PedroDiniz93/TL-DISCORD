const { RARE_ITEM_SHEET } = require("../config");
const {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_EQUIPS_PER_USER,
  MAX_WORLD_BOSS_WEAPONS_T4_PER_USER,
  isKnownRareItem,
  isRareArmor,
  isWorldBossEquipT4,
  isWorldBossWeaponT4,
  stripLeadingItemEmoji,
} = require("../items");
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

  const itemForSheet = stripLeadingItemEmoji(item);
  const userRows = await getUserRareItemRows(interaction.user.id);
  const targetIsArmor = isRareArmor(item);
  const targetIsWorldBossWeaponT4 = isWorldBossWeaponT4(item);
  const targetIsWorldBossEquipT4 = isWorldBossEquipT4(item);
  const targetIsEquip = targetIsArmor || targetIsWorldBossEquipT4;
  const userEquips = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isRareArmor(name) || isWorldBossEquipT4(name));
  const userWorldBossWeaponsT4 = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isWorldBossWeaponT4(name));
  const userAccessories = userRows
    .map((row) => (row.Item || "").trim())
    .filter(
      (name) =>
        isKnownRareItem(name) &&
        !isRareArmor(name) &&
        !isWorldBossWeaponT4(name) &&
        !isWorldBossEquipT4(name)
    );

  if (targetIsEquip && userEquips.length >= MAX_RARE_EQUIPS_PER_USER) {
    return buildWarningItemReply({
      interaction,
      itemName: userEquips[0],
      title: tr(interaction, "⚠️ Limite de equipamento", "⚠️ Equip limit reached"),
      description: tr(
        interaction,
        "Você já possui 1 equipamento T3/T4 registrado. Remova com `/remover_item_raro` ou `/remove_rare_item` para adicionar outro.",
        "You already have 1 registered T3/T4 equip. Remove it with `/remove_rare_item` or `/remover_item_raro` to add another one."
      ),
      fields: [
        {
          name: tr(interaction, "Equipamento registrado", "Registered equip"),
          value: userEquips[0],
          inline: false,
        },
      ],
      components: [buildRemoveItemAction(interaction, "rare")],
    });
  }

  if (
    targetIsWorldBossWeaponT4 &&
    userWorldBossWeaponsT4.length >= MAX_WORLD_BOSS_WEAPONS_T4_PER_USER
  ) {
    return buildWarningItemReply({
      interaction,
      itemName: userWorldBossWeaponsT4[0],
      title: tr(
        interaction,
        "⚠️ Limite de arma Boss Mundo T4",
        "⚠️ World Boss Weapon T4 limit reached"
      ),
      description: tr(
        interaction,
        "Você já possui 1 arma Boss Mundo T4 registrada. Remova com `/remover_item_raro` ou `/remove_rare_item` para adicionar outra.",
        "You already have 1 registered World Boss Weapon T4. Remove it with `/remove_rare_item` or `/remover_item_raro` to add another one."
      ),
      fields: [
        {
          name: tr(
            interaction,
            "Arma Boss Mundo T4 registrada",
            "Registered World Boss Weapon T4"
          ),
          value: userWorldBossWeaponsT4[0],
          inline: false,
        },
      ],
      components: [buildRemoveItemAction(interaction, "rare")],
    });
  }

  if (
    !targetIsArmor &&
    !targetIsWorldBossWeaponT4 &&
    !targetIsWorldBossEquipT4 &&
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
        `Nenhum jogador na fila do item raro **${item}** na aba ${RARE_ITEM_SHEET.title}.`,
        `No players in queue for rare item **${item}** in sheet ${RARE_ITEM_SHEET.title}.`
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
