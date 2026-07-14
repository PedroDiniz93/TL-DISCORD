const { EmbedBuilder } = require("discord.js");
const { appendLootHistoryLog } = require("../logging");
const { buildWarningItemReply } = require("../responses");
const {
  getRequiredOptionAny,
  getUserDisplayName,
  normalizeQueueItemName,
  nowBrasilia,
} = require("../utils");
const { getAdminRoleLabel, hasAdminRole } = require("../permissions");
const {
  addActiveRowByType,
  addDeliveryHistory,
  deleteActiveRowByType,
  getFreshRowsByType,
  getWishlistConfig,
} = require("../wishlist-repository");

const deliveryLocks = new Set();

async function handleMarcarEntregue(interaction) {
  if (!(await hasAdminRole(interaction))) {
    const adminRoleLabel = await getAdminRoleLabel(interaction);
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Acesso negado",
        description: `Apenas membros com cargo ${adminRoleLabel} podem marcar itens como entregues.`,
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
  const config = getWishlistConfig(type);
  const lockKey = buildDeliveryLockKey(type, item, player);

  if (deliveryLocks.has(lockKey)) {
    return buildWarningItemReply({
      interaction,
      itemName: item,
      title: "Entrega em andamento",
      description: `Já existe uma marcação de entrega em andamento para ${player} em **${item}**.`,
    });
  }

  deliveryLocks.add(lockKey);

  try {
    return await markItemDeliveredLocked({
      interaction,
      type,
      item,
      player,
      config,
    });
  } finally {
    deliveryLocks.delete(lockKey);
  }
}

async function markItemDeliveredLocked({ interaction, type, item, player, config }) {
  const rows = await getFreshRowsByType(type);
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
  const registeredAt = String(targetRow.Data || "").trim();

  await deleteActiveRowByType(type, targetRow);
  await assertActiveRowRemoved({
    type,
    config,
    registeredAt,
    player: deliveredPlayer,
    item: deliveredItem,
    discordUserId,
  });

  try {
    await addDeliveryHistory({
      type,
      deliveredAt,
      player: deliveredPlayer,
      item: deliveredItem,
      discordUserId,
    });
  } catch (err) {
    await rollbackActiveRow({
      type,
      registeredAt,
      player: deliveredPlayer,
      item: deliveredItem,
      discordUserId,
      cause: err,
    });
    throw err;
  }

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

async function assertActiveRowRemoved({ type, config, registeredAt, player, item, discordUserId }) {
  const rows = await getFreshRowsByType(type);
  const stillExists = rows.some((row) => {
    return (
      normalizeQueueItemName(row[config.itemColumn]) === normalizeQueueItemName(item) &&
      normalizePlayerName(row.Nick) === normalizePlayerName(player) &&
      String(row.DiscordUserId || "").trim() === discordUserId &&
      String(row.Data || "").trim() === registeredAt
    );
  });

  if (stillExists) {
    throw new Error(`Delivery aborted: active wishlist row was not removed for ${player} / ${item}.`);
  }
}

async function rollbackActiveRow({ type, registeredAt, player, item, discordUserId, cause }) {
  try {
    await addActiveRowByType(type, {
      registeredAt,
      nick: player,
      item,
      discordUserId,
    });
  } catch (rollbackErr) {
    rollbackErr.message = `Rollback failed after delivery history error: ${rollbackErr.message}. Original error: ${cause?.message || cause}`;
    throw rollbackErr;
  }
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

function buildDeliveryLockKey(type, item, player) {
  return [
    type,
    normalizeQueueItemName(item),
    normalizePlayerName(player),
  ].join("|");
}

module.exports = {
  handleMarcarEntregue,
};
