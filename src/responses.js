const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getItemImage } = require("./item-assets");
const { shortStableHash, tr } = require("./utils");

function buildRegisteredItemReply({ interaction, nick, itemName, itemLabel, type }) {
  const reply = buildItemStatusReply({
    interaction,
    itemName,
    color: 0xf2dd92,
    title: tr(interaction, "✅ Registro confirmado", "✅ Registration confirmed"),
    description: tr(
      interaction,
      `**${itemName}** foi adicionado à sua lista de desejos.`,
      `**${itemName}** was added to your wishlist.`
    ),
    fields: [
      {
        name: tr(interaction, "Nick", "Nickname"),
        value: nick,
        inline: true,
      },
      {
        name: tr(interaction, itemLabel.pt, itemLabel.en),
        value: itemName,
        inline: false,
      },
    ],
  });

  if (!type) return reply;

  return {
    ...reply,
    components: [buildRegisteredItemActions(interaction, type)],
  };
}

function createItemAttachmentAndThumbnail(itemName) {
  const image = getItemImage(itemName);
  if (!image) {
    return {
      attachment: null,
      thumbnailUrl: null,
    };
  }

  return {
    attachment: new AttachmentBuilder(image.path, {
      name: image.attachmentName,
    }),
    thumbnailUrl: `attachment://${image.attachmentName}`,
  };
}

function buildArchWishlistReply({ interaction, rows }) {
  const firstWeapon = rows.find((row) => row.Arma)?.Arma;
  const { attachment, thumbnailUrl } = createItemAttachmentAndThumbnail(firstWeapon);

  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(tr(interaction, "📋 Sua lista Archboss", "📋 Your Archboss wishlist"))
    .setDescription(
      tr(
        interaction,
        `Você tem **${rows.length}** registro(s) na lista de desejos.`,
        `You have **${rows.length}** wishlist record(s).`
      )
    )
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

  rows.slice(0, 10).forEach((row, idx) => {
    embed.addFields({
      name: `${idx + 1}. ${row.Arma || tr(interaction, "Arma não informada", "Unknown weapon")}`,
      value: [
        `**${tr(interaction, "Nick", "Nickname")}:** ${row.Nick || tr(interaction, "Não informado", "Unknown")}`,
        row.Data
          ? `**${tr(interaction, "Registrado em", "Registered at")}:** ${row.Data}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      inline: false,
    });
  });

  if (rows.length > 10) {
    embed.addFields({
      name: tr(interaction, "Mais registros", "More records"),
      value: tr(
        interaction,
        `... e mais ${rows.length - 10} registro(s).`,
        `... and ${rows.length - 10} more record(s).`
      ),
      inline: false,
    });
  }

  return attachment ? { embeds: [embed], files: [attachment] } : { embeds: [embed] };
}

function buildRareItemWishlistReply({ interaction, rows }) {
  const firstItem = rows.find((row) => row.Item)?.Item;
  const { attachment, thumbnailUrl } = createItemAttachmentAndThumbnail(firstItem);

  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(tr(interaction, "📋 Seus itens raros", "📋 Your rare item wishlist"))
    .setDescription(
      tr(
        interaction,
        `Você tem **${rows.length}** registro(s) de item raro.`,
        `You have **${rows.length}** rare item record(s).`
      )
    )
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

  rows.slice(0, 10).forEach((row, idx) => {
    embed.addFields({
      name: `${idx + 1}. ${row.Item || tr(interaction, "Item não informado", "Unknown item")}`,
      value: [
        `**${tr(interaction, "Nick", "Nickname")}:** ${row.Nick || tr(interaction, "Não informado", "Unknown")}`,
        row.Data
          ? `**${tr(interaction, "Registrado em", "Registered at")}:** ${row.Data}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      inline: false,
    });
  });

  if (rows.length > 10) {
    embed.addFields({
      name: tr(interaction, "Mais registros", "More records"),
      value: tr(
        interaction,
        `... e mais ${rows.length - 10} registro(s).`,
        `... and ${rows.length - 10} more record(s).`
      ),
      inline: false,
    });
  }

  return attachment ? { embeds: [embed], files: [attachment] } : { embeds: [embed] };
}

function buildMyItemsReply({ interaction, archRows, rareItemRows }) {
  const firstItemWithImage =
    archRows.find((row) => row.Arma)?.Arma ||
    rareItemRows.find((row) => row.Item)?.Item;
  const { attachment, thumbnailUrl } =
    createItemAttachmentAndThumbnail(firstItemWithImage);
  const total = archRows.length + rareItemRows.length;

  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(tr(interaction, "📋 Meus itens", "📋 My items"))
    .setDescription(
      total
        ? tr(
            interaction,
            `Você tem **${archRows.length}** arma(s) Archboss e **${rareItemRows.length}** item(ns) raro(s) registrados.`,
            `You have **${archRows.length}** Archboss weapon(s) and **${rareItemRows.length}** rare item(s) registered.`
          )
        : tr(
            interaction,
            "Você ainda não tem itens registrados na lista de desejos.",
            "You don't have any wishlist items registered yet."
          )
    )
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

  embed.addFields(
    {
      name: tr(interaction, "Arma Archboss", "Archboss weapon"),
      value: formatMyItemsRows({
        interaction,
        rows: archRows,
        itemKey: "Arma",
        emptyText: tr(
          interaction,
          "Nenhuma arma Archboss registrada.",
          "No Archboss weapon registered."
        ),
      }),
      inline: false,
    },
    {
      name: tr(interaction, "Itens raros", "Rare items"),
      value: formatMyItemsRows({
        interaction,
        rows: rareItemRows,
        itemKey: "Item",
        emptyText: tr(
          interaction,
          "Nenhum item raro registrado.",
          "No rare items registered."
        ),
      }),
      inline: false,
    }
  );

  const reply = attachment ? { embeds: [embed], files: [attachment] } : { embeds: [embed] };
  const components = buildMyItemsRemoveActions({ interaction, archRows, rareItemRows });

  if (components.length) {
    return {
      ...reply,
      components,
    };
  }

  return reply;
}

function formatMyItemsRows({ interaction, rows, itemKey, emptyText }) {
  if (!rows.length) return emptyText;

  const lines = rows.slice(0, 8).map((row, idx) => {
    const itemName =
      row[itemKey] || tr(interaction, "Item não informado", "Unknown item");
    const nick = row.Nick || tr(interaction, "Não informado", "Unknown");
    const dateLine = row.Data
      ? `\n${tr(interaction, "Registrado em", "Registered at")}: ${row.Data}`
      : "";
    return `${idx + 1}. **${itemName}**\n${tr(
      interaction,
      "Nick",
      "Nickname"
    )}: ${nick}${dateLine}`;
  });

  if (rows.length > 8) {
    lines.push(
      tr(
        interaction,
        `... e mais ${rows.length - 8} registro(s).`,
        `... and ${rows.length - 8} more record(s).`
      )
    );
  }

  return lines.join("\n\n");
}

function buildRemovedItemReply({ interaction, nick, itemName, itemLabel }) {
  return buildItemStatusReply({
    interaction,
    itemName,
    color: 0xd9826b,
    title: tr(interaction, "🗑️ Registro removido", "🗑️ Registration removed"),
    description: tr(
      interaction,
      `**${itemName}** foi removido da sua lista de desejos.`,
      `**${itemName}** was removed from your wishlist.`
    ),
    fields: [
      {
        name: tr(interaction, "Nick", "Nickname"),
        value: nick,
        inline: true,
      },
      {
        name: tr(interaction, itemLabel.pt, itemLabel.en),
        value: itemName,
        inline: false,
      },
    ],
  });
}

function buildEmptyItemReply({ interaction, itemName, title, description }) {
  return buildItemStatusReply({
    interaction,
    itemName,
    color: 0x8a95a8,
    title,
    description,
  });
}

function buildWarningItemReply({
  interaction,
  itemName,
  title,
  description,
  fields = [],
  components = [],
}) {
  return buildItemStatusReply({
    interaction,
    itemName,
    color: 0xf2b84b,
    title,
    description,
    fields,
    components,
  });
}

function buildItemStatusReply({
  interaction,
  itemName,
  color,
  title,
  description,
  fields = [],
  components = [],
}) {
  const { attachment, thumbnailUrl } = createItemAttachmentAndThumbnail(itemName);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  if (fields.length) embed.addFields(fields);

  return {
    embeds: [embed],
    ...(attachment ? { files: [attachment] } : {}),
    ...(components.length ? { components } : {}),
  };
}

function buildHelpReply({ interaction }) {
  const isPt = tr(interaction, true, false);

  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(tr(interaction, "Ajuda do bot", "Bot help"))
    .setDescription(
      tr(
        interaction,
        "Resumo das regras da lista de desejos e comandos disponíveis.",
        "Summary of wishlist rules and available commands."
      )
    )
    .addFields(
      {
        name: tr(interaction, "Regras resumidas", "Summarized rules"),
        value: isPt
          ? [
              "Cada jogador pode registrar 1 arma Archboss.",
              "Cada jogador pode registrar até 1 equipamento T3/T4.",
              "Cada jogador pode registrar até 3 acessórios/joias.",
              "Cada jogador pode registrar até 1 arma Boss Mundo T4.",
              "Você só pode remover registros feitos por você.",
              "As filas são wishlist e não representam necessariamente prioridade.",
            ].join("\n")
          : [
              "Each player can register 1 Archboss weapon.",
              "Each player can register up to 1 T3/T4 equip.",
              "Each player can register up to 3 accessories/jewelry.",
              "Each player can register up to 1 World Boss Weapon T4.",
              "You can only remove records created by you.",
              "Queues are wishlists and do not necessarily represent priority.",
            ].join("\n"),
        inline: false,
      },
      {
        name: tr(interaction, "Comandos principais", "Main commands"),
        value: [
          "`/arma_arch` / `/weapon_arch`",
          "`/item_raro` / `/rare_item`",
          "`/meus_itens` / `/my_items`",
          "`/fila_arch` / `/arch_queue`",
          "`/fila_item_raro` / `/rare_item_queue`",
          "`/item_info`",
          "`/remover_arch` / `/remove_arch`",
          "`/remover_item_raro` / `/remove_rare_item`",
          "`/listar_arch` / `/list_arch`",
          "`/ajuda` / `/help`",
          "`/baixar_logs`",
          "`/status_bot`",
          "`/admin_backup_planilha`",
        ].join("\n"),
        inline: false,
      },
      {
        name: tr(interaction, "Canal", "Channel"),
        value: tr(
          interaction,
          "Use os comandos no canal configurado para o bot.",
          "Use commands in the configured bot channel."
        ),
        inline: false,
      }
    )
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  return { embeds: [embed] };
}

function buildArchQueueReply({ interaction, itemName, rows }) {
  return buildItemQueueReply({
    interaction,
    itemName,
    rows,
    title: tr(interaction, "📜 Fila Archboss", "📜 Archboss queue"),
    description: tr(
      interaction,
      `**${itemName}**\n${rows.length} jogador(es) na fila.`,
      `**${itemName}**\n${rows.length} player(s) in queue.`
    ),
  });
}

function buildRareItemQueueReply({ interaction, itemName, rows }) {
  return buildItemQueueReply({
    interaction,
    itemName,
    rows,
    title: tr(interaction, "📜 Fila Item Raro", "📜 Rare item queue"),
    description: tr(
      interaction,
      `**${itemName}**\n${rows.length} jogador(es) na fila.`,
      `**${itemName}**\n${rows.length} player(s) in queue.`
    ),
  });
}

function buildItemQueueReply({ interaction, itemName, rows, title, description }) {
  const { attachment, thumbnailUrl } = createItemAttachmentAndThumbnail(itemName);
  const embed = new EmbedBuilder()
    .setColor(0xf2dd92)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: tr(
        interaction,
        "Wishlist apenas; não representa necessariamente prioridade.",
        "Wishlist only; not necessarily priority order."
      ),
    })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

  const queueLines = rows.slice(0, 20).map(({ row, discordDisplayName }) => {
    const nick = row.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
    const memberLabel = discordDisplayName ? ` (@${discordDisplayName})` : "";
    const registeredAt = row.Data
      ? tr(interaction, `\nRegistrado em ${row.Data}`, `\nRegistered at ${row.Data}`)
      : "";
    return `${nick}${memberLabel}${registeredAt}`;
  });

  embed.addFields({
    name: tr(interaction, "Jogadores", "Players"),
    value: queueLines.join("\n\n"),
    inline: false,
  });

  if (rows.length > 20) {
    embed.addFields({
      name: tr(interaction, "Mais jogadores", "More players"),
      value: tr(
        interaction,
        `... e mais ${rows.length - 20} jogador(es).`,
        `... and ${rows.length - 20} more player(s).`
      ),
      inline: false,
    });
  }

  return attachment ? { embeds: [embed], files: [attachment] } : { embeds: [embed] };
}

function buildRegisteredItemActions(interaction, type) {
  const lang = tr(interaction, "pt", "en");

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wishlist:${type}:queue:${lang}`)
      .setLabel(tr(interaction, "Ver fila", "View queue"))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`wishlist:${type}:remove:${lang}`)
      .setLabel(tr(interaction, "Remover", "Remove"))
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`wishlist:${type}:mine:${lang}`)
      .setLabel(tr(interaction, "Meus itens", "My items"))
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildRemoveItemAction(interaction, type) {
  const lang = tr(interaction, "pt", "en");

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`wishlist:${type}:remove:${lang}`)
      .setLabel(tr(interaction, "Remover", "Remove"))
      .setStyle(ButtonStyle.Danger)
  );
}

function buildMyItemsRemoveActions({ interaction, archRows, rareItemRows }) {
  const lang = tr(interaction, "pt", "en");
  const buttons = [];

  archRows.slice(0, 1).forEach((row) => {
    const itemName = String(row.Arma || "").trim();
    if (!itemName) return;

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`myitems:arch:${shortStableHash(itemName)}:${lang}`)
        .setLabel(tr(interaction, "Remover Archboss", "Remove Archboss"))
        .setStyle(ButtonStyle.Danger)
    );
  });

  rareItemRows.slice(0, 4).forEach((row, index) => {
    const itemName = String(row.Item || "").trim();
    if (!itemName) return;

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`myitems:rare:${shortStableHash(itemName)}:${lang}`)
        .setLabel(tr(interaction, `Remover item ${index + 1}`, `Remove item ${index + 1}`))
        .setStyle(ButtonStyle.Danger)
    );
  });

  if (!buttons.length) return [];
  return [new ActionRowBuilder().addComponents(buttons.slice(0, 5))];
}

function buildControlPanelReply(interaction = null) {
  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(panelTr(interaction, "Painel Archboss", "Archboss Panel"))
    .setDescription(
      panelTr(
        interaction,
        "Use os botões abaixo para registrar seus itens e consultar sua lista sem precisar digitar comandos.",
        "Use the buttons below to register your items and check your wishlist without typing commands."
      )
    )
    .setFooter({
      text: "TL control panel",
    });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("panel:register_arch")
          .setLabel(panelTr(interaction, "Registrar arma Archboss", "Register Archboss weapon"))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("panel:register_rare")
          .setLabel(panelTr(interaction, "Registrar item raro", "Register rare item"))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("panel:my_items")
          .setLabel(panelTr(interaction, "Meus itens", "My items"))
          .setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("panel:queue_arch")
          .setLabel(panelTr(interaction, "Ver fila Archboss", "View Archboss queue"))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("panel:queue_rare")
          .setLabel(panelTr(interaction, "Ver fila item raro", "View rare item queue"))
          .setStyle(ButtonStyle.Success)
      ),
    ],
  };
}

function panelTr(interaction, ptBr, en) {
  if (interaction?.locale === "bilingual") return `${ptBr} / ${en}`;
  return tr(interaction, ptBr, en);
}

module.exports = {
  buildArchQueueReply,
  buildArchWishlistReply,
  buildEmptyItemReply,
  buildControlPanelReply,
  buildHelpReply,
  buildRareItemQueueReply,
  buildRareItemWishlistReply,
  buildMyItemsReply,
  buildRegisteredItemReply,
  buildRemoveItemAction,
  buildRemovedItemReply,
  buildWarningItemReply,
};
