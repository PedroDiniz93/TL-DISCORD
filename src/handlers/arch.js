const { ARCH_SHEET } = require("../config");
const {
  buildArchQueueReply,
  buildArchWishlistReply,
  buildRegisteredItemReply,
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
    const weaponList = userWeapons.length
      ? `\nRegistered weapon(s): ${userWeapons.join(", ")}`
      : "";

    return interaction.editReply(
      tr(
        interaction,
        "⚠️ Você já possui uma arma de Archboss registrada. Remova com `/remover_arch` ou `/remove_arch` para adicionar outra." +
          (userWeapons.length ? `\nArma(s) registrada(s): ${userWeapons.join(", ")}` : ""),
        "⚠️ You already have an Archboss weapon registered. Remove it with `/remove_arch` or `/remover_arch` to add another one." +
          weaponList
      )
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
      tr(
        interaction,
        "📭 Você ainda não tem armas de Archboss registradas.",
        "📭 You don't have any registered Archboss weapons yet."
      )
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
      tr(
        interaction,
        "⚠️ Não encontrei esse item na sua lista de desejos.",
        "⚠️ I couldn't find this item in your wishlist."
      )
    );
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await targetRow.delete();

  return interaction.editReply(
    tr(
      interaction,
      `🗑️ Removido!\nNick: **${nick}**\nArma removida: **${arma}**`,
      `🗑️ Removed!\nNickname: **${nick}**\nRemoved weapon: **${arma}**`
    )
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
      tr(
        interaction,
        `📭 Nenhum jogador na fila de **${item}** na aba ${ARCH_SHEET.title}.`,
        `📭 No players in queue for **${item}** in sheet ${ARCH_SHEET.title}.`
      )
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
