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

module.exports = {
  buildRegisteredItemReply,
};
