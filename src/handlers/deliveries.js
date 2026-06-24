const { EmbedBuilder } = require("discord.js");
const {
  ARCH_GAIN_HISTORY_SHEET,
  ARCH_SHEET,
  RARE_ITEM_GAIN_HISTORY_SHEET,
  RARE_ITEM_SHEET,
} = require("../config");
const { appendLootHistoryLog } = require("../logging");
const { buildWarningItemReply } = require("../responses");
const { getSheet } = require("../sheets");
const {
  getRequiredOptionAny,
  getUserDisplayName,
  normalizeQueueItemName,
  nowBrasilia,
} = require("../utils");
const { getAdminRoleLabel, hasAdminRole } = require("../permissions");

async function handleMarcarEntregue(interaction) {
  if (!(await hasAdminRole(interaction))) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Acesso negado",
        description: `Apenas membros com cargo ${getAdminRoleLabel()} podem marcar itens como entregues.`,
      })
    );
  }

  const type = getRequiredOptionAny(interaction, ["tipo"]);
  const item = getRequiredOptionAny(interaction, ["item"]);
  const player = getRequiredOptionAny(interaction, ["player"]);

  if (!["arch", "rare"].includes(type)) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        itemName: item,
        title: "Tipo inválido",
        description: "Use arch para Archboss ou rare para item raro.",
      })
    );
  }

  const delivery = await markItemDelivered({
    interaction,
    type,
    item,
    player,
  });

  return interaction.editReply(delivery);
}

async function markItemDelivered({ interaction, type, item, player }) {
  const config = getDeliveryConfig(type);
  const activeSheet = await getSheet(config.active.title, config.active.headers);
  const rows = await activeSheet.getRows();
  const targetRow = findDeliveryTarget(rows, config.itemColumn, item, player);

  if (!targetRow) {
    return buildWarningItemReply({
      interaction,
      itemName: item,
      title: "Registro não encontrado",
      description: `Não encontrei ${player} na fila de **${item}**.`,
    });
  }

  const deliveredAt = nowBrasilia();
  const deliveredPlayer = String(targetRow.Nick || player).trim();
  const deliveredItem = String(targetRow[config.itemColumn] || item).trim();
  const discordUserId = String(targetRow.DiscordUserId || "").trim();

  const historySheet = await getSheet(config.history.title, config.history.headers);
  await historySheet.addRow({
    "Data/Hora": deliveredAt,
    Player: deliveredPlayer,
    Item: deliveredItem,
    DiscordUserId: discordUserId,
  });
  await targetRow.delete();

  await appendLootHistoryLog({
    interaction,
    action: "delivered",
    itemType: type,
    item: deliveredItem,
    nick: deliveredPlayer,
  });

  return buildDeliveredReply({
    type,
    item: deliveredItem,
    player: deliveredPlayer,
    discordUserId,
    deliveredAt,
    adminName: getUserDisplayName(interaction.user),
  });
}

function getDeliveryConfig(type) {
  if (type === "arch") {
    return {
      active: ARCH_SHEET,
      history: ARCH_GAIN_HISTORY_SHEET,
      itemColumn: "Arma",
      label: "Archboss",
    };
  }

  return {
    active: RARE_ITEM_SHEET,
    history: RARE_ITEM_GAIN_HISTORY_SHEET,
    itemColumn: "Item",
    label: "Item raro",
  };
}

function findDeliveryTarget(rows, itemColumn, item, player) {
  const targetItem = normalizeQueueItemName(item);
  const targetPlayer = normalizePlayerName(player);

  return rows.find((row) => {
    const rowItem = normalizeQueueItemName(row[itemColumn]);
    const rowPlayer = normalizePlayerName(row.Nick);
    return rowItem === targetItem && rowPlayer === targetPlayer;
  });
}

function buildDeliveredReply({
  type,
  item,
  player,
  discordUserId,
  deliveredAt,
  adminName,
}) {
  const label = type === "arch" ? "Archboss" : "Item raro";
  const mention = discordUserId ? ` (<@${discordUserId}>)` : "";
  const embed = new EmbedBuilder()
    .setColor(0x57c785)
    .setTitle("Item marcado como entregue")
    .setDescription(`**${item}** foi removido da fila e registrado no histórico.`)
    .addFields(
      {
        name: "Tipo",
        value: label,
        inline: true,
      },
      {
        name: "Player",
        value: `${player}${mention}`,
        inline: true,
      },
      {
        name: "Data/Hora",
        value: deliveredAt,
        inline: false,
      },
      {
        name: "Marcado por",
        value: adminName,
        inline: false,
      }
    )
    .setFooter({
      text: "Histórico de ganho atualizado",
    })
    .setTimestamp();

  return {
    embeds: [embed],
  };
}

function normalizePlayerName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
  handleMarcarEntregue,
};
