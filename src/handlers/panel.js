const {
  ActionRowBuilder,
  ModalBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const {
  buildControlPanelReply,
  buildItemInfoButton,
  buildWarningItemReply,
} = require("../responses");
const { ALLOWED_CHANNEL_ID } = require("../config");
const { buildFilaArchReply, registerArchWeapon } = require("./arch");
const { buildFilaItemRaroReply, registerRareItem } = require("./rare-items");
const { buildItemInfoReply } = require("./item-info");
const { buildMyItemsForInteraction } = require("./my-items");
const { findKnownItemByHash, getItemInfo } = require("../item-info-service");
const {
  rareItems,
  weapons,
  isRareArmor,
  isWorldBossEquipT4,
  isWorldBossJewelryT4,
  isWorldBossWeaponT4,
} = require("../items");
const { shortStableHash, tr } = require("../utils");

const PANEL_MESSAGE_TITLES = new Set([
  "Painel Archboss",
  "Archboss Panel",
  "Painel Archboss / Archboss Panel",
]);

function buildControlPanelMessage() {
  return buildControlPanelReply({ locale: "bilingual" });
}

async function handleControlPanelButton(interaction) {
  const [scope, action] = String(interaction.customId || "").split(":");
  if (scope !== "panel") return false;

  const panelInteraction = withPanelLanguage(interaction);

  if (action === "register_arch") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(buildArchSelectReply(panelInteraction, "register"));
    return true;
  }

  if (action === "register_rare") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(buildRareCategorySelectReply(panelInteraction, "register"));
    return true;
  }

  if (action === "queue_arch") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(buildArchSelectReply(panelInteraction, "queue"));
    return true;
  }

  if (action === "queue_rare") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(buildRareCategorySelectReply(panelInteraction, "queue"));
    return true;
  }

  if (action === "back") {
    const target = String(interaction.customId || "")
      .split(":")
      .slice(2)
      .join(":") || "home";
    await interaction.update(buildPanelBackReply(panelInteraction, target));
    return true;
  }

  if (action === "info") {
    const itemHash = String(interaction.customId || "").split(":")[2] || "";
    const itemName = findKnownItemByHash(itemHash, shortStableHash);
    await interaction.deferUpdate();
    await interaction.editReply(await buildPanelItemInfoReply(panelInteraction, itemName));
    return true;
  }

  await interaction.deferReply({ ephemeral: true });

  if (action === "my_items") {
    await interaction.editReply(await buildMyItemsForInteraction(panelInteraction));
    return true;
  }

  await interaction.editReply(
    buildWarningItemReply({
      interaction: panelInteraction,
      title: tr(panelInteraction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        panelInteraction,
        "Esse botão do painel não está mais disponível.",
        "This panel button is no longer available."
      ),
    })
  );
  return true;
}

async function handleControlPanelSelect(interaction) {
  const [scope, kind, action, step] = String(interaction.customId || "").split(":");
  if (scope !== "panel-select") return false;

  const panelInteraction = withPanelLanguage(interaction);
  const value = String(interaction.values?.[0] || "");

  if (kind === "arch") {
    if (action === "register") {
      await interaction.showModal(
        await buildRegisterArchModal({ interaction: panelInteraction, value })
      );
      return true;
    }

    if (action === "queue") {
      await interaction.deferUpdate();
      await interaction.editReply(
        withPanelQueueActions({
          reply: await buildFilaArchReply(panelInteraction, value),
          interaction: panelInteraction,
          itemName: value,
          backTarget: "home",
        })
      );
      return true;
    }
  }

  if (kind === "rare") {
    if (action === "category") {
      await interaction.update(
        buildRareItemSelectReply(panelInteraction, step, value)
      );
      return true;
    }

    if (action === "register") {
      await interaction.showModal(
        await buildRegisterRareModal({ interaction: panelInteraction, value })
      );
      return true;
    }

    if (action === "queue") {
      await interaction.deferUpdate();
      await interaction.editReply(
        withPanelQueueActions({
          reply: await buildFilaItemRaroReply(panelInteraction, value),
          interaction: panelInteraction,
          itemName: value,
          backTarget: `rare_category:${action}`,
        })
      );
      return true;
    }
  }

  return false;
}

async function handleControlPanelModal(interaction) {
  const [scope, action] = String(interaction.customId || "").split(":");
  if (scope !== "panel") return false;

  const panelInteraction = withPanelLanguage(interaction);
  await interaction.deferReply({ ephemeral: true });

  if (action === "register_arch") {
    const encodedItem = interaction.customId.split(":")[2] || "";
    const nick = interaction.fields.getTextInputValue("nick");
    const arma = decodePanelValue(encodedItem);
    return interaction.editReply(
      await registerArchWeapon({
        interaction: panelInteraction,
        nick,
        arma,
      })
    );
  }

  if (action === "register_rare") {
    const encodedItem = interaction.customId.split(":")[2] || "";
    const nick = interaction.fields.getTextInputValue("nick");
    const item = decodePanelValue(encodedItem);
    return interaction.editReply(
      await registerRareItem({
        interaction: panelInteraction,
        nick,
        item,
      })
    );
  }

  if (action === "queue_arch") {
    const item = interaction.fields.getTextInputValue("arch_weapon");
    return interaction.editReply(await buildFilaArchReply(panelInteraction, item));
  }

  if (action === "queue_rare") {
    const item = interaction.fields.getTextInputValue("rare_item");
    return interaction.editReply(await buildFilaItemRaroReply(panelInteraction, item));
  }

  return interaction.editReply(
    buildWarningItemReply({
      interaction: panelInteraction,
      title: tr(panelInteraction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        panelInteraction,
        "Esse formulário do painel não está mais disponível.",
        "This panel form is no longer available."
      ),
    })
  );
}

async function ensureControlPanel(client, channelName) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return false;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channel = ALLOWED_CHANNEL_ID
    ? await findTextChannelById(guild, ALLOWED_CHANNEL_ID)
    : await findTextChannelByName(guild, channelName);
  if (!channel) {
    console.warn(
      `⚠️ Control panel channel not found: ${ALLOWED_CHANNEL_ID || channelName}`
    );
    return false;
  }

  const pinned = await channel.messages.fetchPins().catch(() => null);
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing =
    findPanelMessage(pinned, client.user.id) || findPanelMessage(recent, client.user.id);

  if (existing) {
    await existing.edit(buildControlPanelMessage()).catch(() => null);
    return true;
  }

  const sent = await channel.send(buildControlPanelMessage()).catch(() => null);
  if (sent?.pinnable) {
    await sent.pin().catch(() => null);
  }
  return Boolean(sent);
}

async function buildRegisterArchModal(item) {
  const interaction = item.interaction;
  const value = item.value;

  return new ModalBuilder()
    .setCustomId(`panel:register_arch:${encodePanelValue(value)}`)
    .setTitle(tr(interaction, "Registrar arma Archboss", "Register Archboss weapon"))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setValue(lastNick.slice(0, 100))
          .setRequired(true)
      )
    );
}

async function buildRegisterRareModal(item) {
  const interaction = item.interaction;
  const value = item.value;

  return new ModalBuilder()
    .setCustomId(`panel:register_rare:${encodePanelValue(value)}`)
    .setTitle(tr(interaction, "Registrar item raro", "Register rare item"))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setValue(lastNick.slice(0, 100))
          .setRequired(true)
      )
    );
}

async function findTextChannelById(guild, channelId) {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;
  return channel;
}

async function findTextChannelByName(guild, channelName) {
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  const target = normalizeChannelName(channelName);

  return (
    channels.find((channel) => {
      if (!channel || !channel.isTextBased?.() || !("name" in channel)) {
        return false;
      }

      const current = normalizeChannelName(channel.name);
      return current === target || current.includes(target) || target.includes(current);
    }) || null
  );
}

function normalizeChannelName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function findPanelMessage(messages, botUserId) {
  if (!messages) return null;

  const messageList = getMessageList(messages);

  return (
    messageList.find((message) => {
      const embed = message.embeds?.[0];
      return (
        message.author?.id === botUserId &&
        PANEL_MESSAGE_TITLES.has(embed?.title) &&
        embed?.footer?.text === "TL control panel"
      );
    }) || null
  );
}

function getMessageList(messages) {
  if (typeof messages.values === "function") return Array.from(messages.values());
  if (Array.isArray(messages)) return messages;
  if (Array.isArray(messages.items)) {
    return messages.items.map((item) => item.message || item).filter(Boolean);
  }
  return [];
}

function withPanelLanguage(interaction) {
  return new Proxy(interaction, {
    get(target, prop, receiver) {
      if (prop === "locale") return target.locale || "pt-BR";
      return Reflect.get(target, prop, receiver);
    },
  });
}

function buildArchSelectReply(interaction, action) {
  return buildSelectReply({
    interaction,
    title:
      action === "register"
        ? tr(interaction, "Selecione a arma", "Select weapon")
        : tr(interaction, "Selecione a arma da fila", "Select queue weapon"),
    description:
      action === "register"
        ? tr(
            interaction,
            "Escolha a arma Archboss para registrar.",
            "Choose the Archboss weapon to register."
          )
        : tr(
            interaction,
            "Escolha a arma Archboss para ver a fila.",
            "Choose the Archboss weapon to view the queue."
          ),
    customId: `panel-select:arch:${action}`,
    options: weapons.map((item) => ({
      label: trimSelectLabel(item),
      value: item,
    })),
  });
}

function buildRareCategorySelectReply(interaction, action) {
  return buildSelectReply({
    interaction,
    title:
      action === "register"
        ? tr(interaction, "Selecione o tipo de item", "Select item type")
        : tr(interaction, "Selecione a categoria da fila", "Select queue category"),
    description:
      action === "register"
        ? tr(
            interaction,
            "Escolha primeiro a categoria do item raro.",
            "Choose the rare item category first."
          )
        : tr(
            interaction,
            "Escolha primeiro a categoria do item raro da fila.",
            "Choose the rare item queue category first."
          ),
    customId: `panel-select:rare:category:${action}`,
    options: [
      {
        label: tr(interaction, "Equipamentos Raro T3", "Rare Equips T3"),
        value: "armor",
      },
      {
        label: tr(interaction, "Acessório Raro T3", "Rare Accessory T3"),
        value: "accessory",
      },
      {
        label: tr(interaction, "Arma Boss Mundo T4", "World Boss Weapon T4"),
        value: "world_boss_weapon_t4",
      },
      {
        label: tr(interaction, "Equipamentos Boss Mundo T4", "World Boss Equips T4"),
        value: "world_boss_equip_t4",
      },
      {
        label: tr(interaction, "Joias Boss Mundo T4", "World Boss Jewelry T4"),
        value: "world_boss_jewelry_t4",
      },
    ],
  });
}

function buildRareItemSelectReply(interaction, action, category) {
  const filtered = rareItems.filter((item) => isRareItemInCategory(item, category));

  return buildSelectReply({
    interaction,
    title:
      action === "register"
        ? tr(interaction, "Selecione o item", "Select item")
        : tr(interaction, "Selecione o item da fila", "Select queue item"),
    description:
      action === "register"
        ? tr(
            interaction,
            "Escolha o item raro para registrar.",
            "Choose the rare item to register."
          )
        : tr(
            interaction,
            "Escolha o item raro para ver a fila.",
            "Choose the rare item to view the queue."
          ),
    customId: `panel-select:rare:${action}`,
    backTarget: `rare_category:${action}`,
    options: filtered.map((item) => ({
      label: trimSelectLabel(item),
      value: item,
    })),
  });
}

function isRareItemInCategory(item, category) {
  if (category === "armor") return isRareArmor(item);
  if (category === "world_boss_weapon_t4") return isWorldBossWeaponT4(item);
  if (category === "world_boss_equip_t4") return isWorldBossEquipT4(item);
  if (category === "world_boss_jewelry_t4") return isWorldBossJewelryT4(item);
  return (
    !isRareArmor(item) &&
    !isWorldBossWeaponT4(item) &&
    !isWorldBossEquipT4(item) &&
    !isWorldBossJewelryT4(item)
  );
}

function buildSelectReply({
  interaction,
  title,
  description,
  customId,
  options,
  backTarget = "home",
}) {
  const embed = {
    color: 0x65b0fc,
    title,
    description,
  };

  return {
    embeds: [embed],
    files: [],
    attachments: [],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(customId)
          .setPlaceholder(tr(interaction, "Selecione uma opção", "Select an option"))
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(options.slice(0, 25))
      ),
      new ActionRowBuilder().addComponents(buildBackButton(interaction, backTarget)),
    ],
  };
}

function buildPanelBackReply(interaction, target) {
  if (target.startsWith("rare_category")) {
    const [, action = "register"] = target.split(":");
    return buildRareCategorySelectReply(interaction, action);
  }

  return buildPanelHomeReply(interaction);
}

function withPanelQueueActions({ reply, interaction, itemName, backTarget }) {
  return {
    ...reply,
    components: [
      new ActionRowBuilder().addComponents(
        buildBackButton(interaction, backTarget),
        buildItemInfoButton({
          interaction,
          itemName,
          customIdPrefix: "panel:info",
        })
      ),
    ],
  };
}

async function buildPanelItemInfoReply(interaction, itemName) {
  if (!itemName) {
    return buildWarningItemReply({
      interaction,
      title: tr(interaction, "⚠️ Item não encontrado", "⚠️ Item not found"),
      description: tr(
        interaction,
        "Não consegui identificar o item dessa fila.",
        "I couldn't identify the item from this queue."
      ),
    });
  }

  const info = await getItemInfo(itemName);
  if (!info) {
    return buildWarningItemReply({
      interaction,
      itemName,
      title: tr(interaction, "⚠️ Item não encontrado", "⚠️ Item not found"),
      description: tr(
        interaction,
        "Não encontrei esse item na base conhecida do bot.",
        "I couldn't find this item in the bot known item database."
      ),
    });
  }

  return buildItemInfoReply(info);
}

function buildPanelHomeReply(interaction) {
  return {
    ...buildControlPanelReply(interaction),
    files: [],
    attachments: [],
  };
}

function buildBackButton(interaction, target) {
  return new ButtonBuilder()
    .setCustomId(`panel:back:${target}`)
    .setLabel(tr(interaction, "Voltar", "Back"))
    .setStyle(ButtonStyle.Secondary);
}

function trimSelectLabel(value) {
  return String(value || "").slice(0, 100);
}

function encodePanelValue(value) {
  const index = getPanelItems().findIndex((item) => item === value);
  if (index >= 0) return `i${index}`;
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function decodePanelValue(value) {
  const encoded = String(value || "");
  if (/^i\d+$/.test(encoded)) {
    return getPanelItems()[Number(encoded.slice(1))] || "";
  }

  const hashedItem = getPanelItems().find((item) => shortStableHash(item) === encoded);
  if (hashedItem) return hashedItem;

  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function getPanelItems() {
  return [...weapons, ...rareItems];
}

module.exports = {
  buildControlPanelMessage,
  ensureControlPanel,
  handleControlPanelButton,
  handleControlPanelSelect,
  handleControlPanelModal,
};
