const { RARE_ITEM_SHEET } = require("../config");
const {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_ARMORS_PER_USER,
  isRareArmor,
  isRareWeapon,
} = require("../items");
const { getSheet } = require("../sheets");
const {
  buildPreview,
  getRequiredOptionAny,
  normalizeQueueItemName,
  nowBrasilia,
  parseBrazilianDateTime,
  tr,
} = require("../utils");

async function handleItemRaro(interaction) {
  const nick = getRequiredOptionAny(interaction, ["nickname", "nick"]);
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  const rows = await sheet.getRows();
  const userRows = rows.filter(
    (row) => (row.DiscordUserId || "").trim() === interaction.user.id
  );
  const targetIsWeapon = isRareWeapon(item);
  const targetIsArmor = isRareArmor(item);
  const existingWeapon = userRows
    .map((row) => (row.Item || "").trim())
    .find((name) => isRareWeapon(name));
  const userArmors = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => isRareArmor(name));
  const userAccessories = userRows
    .map((row) => (row.Item || "").trim())
    .filter((name) => name && !isRareWeapon(name) && !isRareArmor(name));

  if (targetIsWeapon && existingWeapon) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui uma arma rara registrada: **${existingWeapon}**. Remova com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outra.`,
        `⚠️ You already have a registered rare weapon: **${existingWeapon}**. Remove it with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  if (targetIsArmor && userArmors.length >= MAX_RARE_ARMORS_PER_USER) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui 1 armadura rara registrada: **${userArmors[0]}**. Remova com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outra.`,
        `⚠️ You already have 1 registered rare armor: **${userArmors[0]}**. Remove it with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  if (
    !targetIsWeapon &&
    !targetIsArmor &&
    userAccessories.length >= MAX_RARE_ACCESSORIES_PER_USER
  ) {
    return interaction.editReply(
      tr(
        interaction,
        `⚠️ Você já possui ${MAX_RARE_ACCESSORIES_PER_USER} acessórios raros registrados. Remova um com \`/remover_item_raro\` ou \`/remove_rare_item\` para adicionar outro.`,
        `⚠️ You already have ${MAX_RARE_ACCESSORIES_PER_USER} registered rare accessories. Remove one with \`/remove_rare_item\` or \`/remover_item_raro\` to add another one.`
      )
    );
  }

  await sheet.addRow({
    Data: nowBrasilia(),
    Nick: nick,
    Item: item,
    DiscordUserId: interaction.user.id,
  });

  return interaction.editReply(
    tr(
      interaction,
      `✅ Registrado!\nNick: **${nick}**\nItem raro: **${item}**`,
      `✅ Registered!\nNickname: **${nick}**\nRare item: **${item}**`
    )
  );
}

async function handleRemoverItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  const rows = await sheet.getRows();
  const targetRow = rows.find(
    (row) =>
      (row.DiscordUserId || "").trim() === interaction.user.id &&
      (row.Item || "").trim() === item
  );

  if (!targetRow) {
    return interaction.editReply(
      tr(
        interaction,
        "⚠️ Não encontrei esse item raro na sua lista de desejos.",
        "⚠️ I couldn't find this rare item in your wishlist."
      )
    );
  }

  const nick = targetRow.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
  await targetRow.delete();

  return interaction.editReply(
    tr(
      interaction,
      `🗑️ Removido!\nNick: **${nick}**\nItem raro removido: **${item}**`,
      `🗑️ Removed!\nNickname: **${nick}**\nRemoved rare item: **${item}**`
    )
  );
}

async function handleFilaItemRaro(interaction) {
  const item = getRequiredOptionAny(interaction, ["rare_item", "item_raro"]);

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
    return interaction.editReply(
      tr(
        interaction,
        `📭 Nenhum jogador na fila do item raro **${item}** na aba ${RARE_ITEM_SHEET.title}.`,
        `📭 No players in queue for rare item **${item}** in sheet ${RARE_ITEM_SHEET.title}.`
      )
    );
  }

  const lines = filtered.map(({ row }) => {
    const nick = row.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
    const registro = row.Data
      ? tr(interaction, ` • Registrado em ${row.Data}`, ` • Registered at ${row.Data}`)
      : "";
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    return `- ${nick}${mention}${registro}`;
  });
  const { preview, suffix } = buildPreview(lines, 25, (extra) =>
    tr(interaction, `\n... e mais ${extra} jogador(es).`, `\n... and ${extra} more player(s).`)
  );

  return interaction.editReply(
    tr(
      interaction,
      `📜 Fila do item raro **${item}** (${filtered.length} jogadores):\n${preview}${suffix}\n\n⚠️ Essa lista mostra apenas quem colocou o item raro na wishlist; não é necessariamente a ordem de prioridade. ⚠️`,
      `📜 Queue for rare item **${item}** (${filtered.length} players):\n${preview}${suffix}\n\n⚠️ This list only shows who added the rare item to the wishlist; it is not necessarily the priority order. ⚠️`
    )
  );
}

module.exports = {
  handleFilaItemRaro,
  handleItemRaro,
  handleRemoverItemRaro,
};
