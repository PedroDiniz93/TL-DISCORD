const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { getItemImage } = require("./item-assets");
const { tr } = require("./utils");

function buildRegisteredItemReply({ interaction, nick, itemName, itemLabel }) {
  const image = getItemImage(itemName);

  if (!image) {
    return tr(
      interaction,
      `✅ Registrado!\nNick: **${nick}**\n${itemLabel.pt}: **${itemName}**`,
      `✅ Registered!\nNickname: **${nick}**\n${itemLabel.en}: **${itemName}**`
    );
  }

  const attachment = new AttachmentBuilder(image.path, {
    name: image.attachmentName,
  });
  const embed = new EmbedBuilder()
    .setColor(0xf2dd92)
    .setTitle(tr(interaction, "✅ Registro confirmado", "✅ Registration confirmed"))
    .setDescription(
      tr(
        interaction,
        `**${itemName}** foi adicionado à sua lista de desejos.`,
        `**${itemName}** was added to your wishlist.`
      )
    )
    .addFields(
      {
        name: tr(interaction, "Nick", "Nickname"),
        value: nick,
        inline: true,
      },
      {
        name: itemLabel.pt,
        value: itemName,
        inline: false,
      }
    )
    .setThumbnail(`attachment://${image.attachmentName}`)
    .setFooter({
      text: tr(interaction, "Lista de desejos TL", "TL wishlist"),
    })
    .setTimestamp();

  return {
    embeds: [embed],
    files: [attachment],
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

  const queueLines = rows.slice(0, 20).map(({ row }) => {
    const nick = row.Nick || tr(interaction, "Nick não informado", "Unknown nickname");
    const mention =
      row.DiscordUserId && String(row.DiscordUserId).trim()
        ? ` (<@${String(row.DiscordUserId).trim()}>)`
        : "";
    const registeredAt = row.Data
      ? tr(interaction, `\nRegistrado em ${row.Data}`, `\nRegistered at ${row.Data}`)
      : "";
    return `${nick}${mention}${registeredAt}`;
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

module.exports = {
  buildArchQueueReply,
  buildArchWishlistReply,
  buildRareItemQueueReply,
  buildRegisteredItemReply,
};
