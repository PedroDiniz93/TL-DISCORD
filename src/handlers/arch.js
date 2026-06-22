const { ARCH_SHEET } = require("../config");
const {
  buildArchQueueReply,
  buildArchWishlistReply,
  buildEmptyItemReply,
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

async function handleArmaArch(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const arma = getRequiredOptionAny(interaction, ["arch_weapon", "arma_arch"]);

  const sheet = await getSheet(ARCH_SHEET.title, ARCH_SHEET.headers);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );

  if (userRows.length) {
    const userWeapons = userRows
      .map((row) => row.Arma)
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean);
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        itemName: userWeapons[0],
        title: tr(interaction, "⚠️ Arma já registrada", "⚠️ Weapon already registered"),
        description: tr(
          interaction,
          "Você já possui uma arma de Archboss registrada. Remova com `/remover_arch` ou `/remove_arch` para adicionar outra.",
          "You already have an Archboss weapon registered. Remove it with `/remove_arch` or `/remover_arch` to add another one."
        ),
        fields: userWeapons.length
          ? [
              {
                name: tr(interaction, "Arma registrada", "Registered weapon"),
                value: userWeapons.join("\n"),
                inline: false,
              },
            ]
          : [],
      })
    );
  }

  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Arma: arma,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(
    buildRegisteredItemReply({
      interaction,
      nick,
      itemName: arma,
      itemLabel: {
        pt: "Arma Archboss",
        en: "Archboss weapon",
      },
    })
  );
}

async function handleListarArch(interaction) {
  const sheet = await getSheet(ARCH_SHEET.title, ARCH_SHEET.headers);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );

  if (!userRows.length) {
    return interaction.editReply(
      buildEmptyItemReply({
        interaction,
        title: tr(interaction, "📭 Lista vazia", "📭 Empty wishlist"),
        description: tr(
          interaction,
          "Você ainda não tem armas de Archboss registradas.",
          "You don't have any registered Archboss weapons yet."
        ),
      })
    );
  }

  return interaction.editReply(buildArchWishlistReply({ interaction, rows: userRows }));
}

async function handleRemoverArch(interaction) {
  const arma = getRequiredOptionAny(interaction, ["arch_weapon", "arma_arch"]);

  const sheet = await getSheet(ARCH_SHEET.title, ARCH_SHEET.headers);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Arma || "").trim() === arma
  );

  if (!targetRow) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        itemName: arma,
        title: tr(interaction, "⚠️ Item não encontrado", "⚠️ Item not found"),
        description: tr(
          interaction,
          "Não encontrei essa arma na sua lista de desejos.",
          "I couldn't find this weapon in your wishlist."
        ),
      })
    );
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await targetRow.delete();

  return interaction.editReply(
    buildRemovedItemReply({
      interaction,
      nick,
      itemName: arma,
      itemLabel: {
        pt: "Arma removida",
        en: "Removed weapon",
      },
    })
  );
}

async function handleFilaArch(interaction) {
  const item = getRequiredOptionAny(interaction, ["arch_weapon", "item"]);

  const sheet = await getSheet(ARCH_SHEET.title, ARCH_SHEET.headers);
  const rows = await sheet.getRows();
  const targetItem = normalizeQueueItemName(item);
  const filtered = rows
    .filter((row) => normalizeQueueItemName(row.Arma) === targetItem)
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
    return interaction.editReply(
      buildEmptyItemReply({
        interaction,
        itemName: item,
        title: tr(interaction, "📭 Fila vazia", "📭 Empty queue"),
        description: tr(
          interaction,
          `Nenhum jogador na fila de **${item}** na aba ${ARCH_SHEET.title}.`,
          `No players in queue for **${item}** in sheet ${ARCH_SHEET.title}.`
        ),
      })
    );
  }

  return interaction.editReply(
    buildArchQueueReply({
      interaction,
      itemName: item,
      rows: filtered,
    })
  );
}

module.exports = {
  handleArmaArch,
  handleFilaArch,
  handleListarArch,
  handleRemoverArch,
};
