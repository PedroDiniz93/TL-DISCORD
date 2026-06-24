const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { getItemImage } = require("../item-assets");
const { getItemInfo } = require("../item-info-service");
const { buildWarningItemReply } = require("../responses");
const { getRequiredOptionAny, tr } = require("../utils");

async function handleItemInfo(interaction) {
  const item = getRequiredOptionAny(interaction, ["item"]);
  const info = await getItemInfo(item);

  if (!info) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        itemName: item,
        title: tr(interaction, "Item nao encontrado", "Item not found"),
        description: tr(
          interaction,
          "Nao encontrei esse item na base conhecida do bot.",
          "I couldn't find this item in the bot known item database."
        ),
      })
    );
  }

  return interaction.editReply(buildItemInfoReply(info));
}

function buildItemInfoReply(info) {
  const image = getItemImage(info.originalName);
  const embed = new EmbedBuilder()
    .setColor(0x65b0fc)
    .setTitle(info.displayName)
    .addFields(
      {
        name: "Nome PT",
        value: info.ptName || "Nao informado",
        inline: true,
      },
      {
        name: "Nome EN",
        value: info.enName || "Nao informado",
        inline: true,
      },
      {
        name: "Categoria",
        value: info.categoryLabel,
        inline: true,
      },
      {
        name: "Tipo",
        value: info.typeLabel,
        inline: true,
      },
      {
        name: "Limite",
        value: info.limitLabel,
        inline: false,
      },
      {
        name: "Fonte",
        value: buildSourceLabel(info),
        inline: false,
      }
    )
    .setTimestamp();

  for (const field of buildScrapedFields(info)) {
    embed.addFields(field);
  }

  const reply = {
    embeds: [embed],
    components: [buildExternalLinkAction(info.externalUrl)],
  };

  if (image) {
    embed.setThumbnail(`attachment://${image.attachmentName}`);
    reply.files = [
      new AttachmentBuilder(image.path, {
        name: image.attachmentName,
      }),
    ];
  }

  return reply;
}

function buildSourceLabel(info) {
  if (info.source === "tlcodex") {
    return `TL Codex${info.scrapedAt ? ` (${new Date(info.scrapedAt).toLocaleString("pt-BR")})` : ""}`;
  }

  return "Cache local do bot";
}

function buildScrapedFields(info) {
  const fields = [];

  if (info.externalName && info.externalName !== info.displayName) {
    fields.push({
      name: "Nome externo",
      value: info.externalName,
      inline: false,
    });
  }

  const hasLevel12Stats = Array.isArray(info.level12Stats) && info.level12Stats.length;

  if (hasLevel12Stats) {
    fields.push({
      name: "Status +12",
      value: formatPairs(info.level12Stats, 8, 900),
      inline: false,
    });
  }

  if (!hasLevel12Stats && Array.isArray(info.baseStats) && info.baseStats.length) {
    fields.push({
      name: "Status base",
      value: formatPairs(info.baseStats, 8, 900),
      inline: false,
    });
  }

  if (Array.isArray(info.possibleTraits) && info.possibleTraits.length) {
    fields.push({
      name: "Traits possiveis",
      value: formatPairs(info.possibleTraits, 6, 900),
      inline: false,
    });
  }

  if (Array.isArray(info.flags) && info.flags.length) {
    fields.push({
      name: "Status do item",
      value: info.flags.slice(0, 8).join("\n"),
      inline: false,
    });
  }

  if (info.skillEffect) {
    fields.push({
      name: "Efeito",
      value: truncateText(info.skillEffect, 900),
      inline: false,
    });
  }

  return fields;
}

function formatPairs(rows, limit, maxLength) {
  let output = "";

  for (const row of rows.slice(0, limit)) {
    const line = `${row.label}: ${row.value}`;
    const candidate = output ? `${output}\n${line}` : line;
    if (candidate.length > maxLength) break;
    output = candidate;
  }

  return output || "Nao informado";
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildExternalLinkAction(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Buscar database")
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );
}

module.exports = {
  buildItemInfoReply,
  handleItemInfo,
};
