const {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { buildControlPanelReply, buildWarningItemReply } = require("../responses");
const { buildFilaArchReply, registerArchWeapon } = require("./arch");
const { buildFilaItemRaroReply, registerRareItem } = require("./rare-items");
const { buildMyItemsForInteraction } = require("./my-items");
const { rareItems, weapons, isRareArmor } = require("../items");
const { tr } = require("../utils");

const PANEL_MESSAGE_TITLE = "Painel Archboss";

function buildControlPanelMessage() {
  return buildControlPanelReply();
}

async function handleControlPanelButton(interaction) {
  const [scope, action] = String(interaction.customId || "").split(":");
  if (scope !== "panel") return false;

  const panelInteraction = withPanelLanguage(interaction);

  if (action === "register_arch") {
    await interaction.reply({
      ...buildArchSelectReply(panelInteraction, "register"),
      ephemeral: true,
    });
    return true;
  }

  if (action === "register_rare") {
    await interaction.reply({
      ...buildRareCategorySelectReply(panelInteraction, "register"),
      ephemeral: true,
    });
    return true;
  }

  if (action === "queue_arch") {
    await interaction.reply({
      ...buildArchSelectReply(panelInteraction, "queue"),
      ephemeral: true,
    });
    return true;
  }

  if (action === "queue_rare") {
    await interaction.reply({
      ...buildRareCategorySelectReply(panelInteraction, "queue"),
      ephemeral: true,
    });
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
      await interaction.showModal(buildRegisterArchModal(value));
      return true;
    }

    if (action === "queue") {
      await interaction.deferUpdate();
      await interaction.editReply(await buildFilaArchReply(panelInteraction, value));
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
      await interaction.showModal(buildRegisterRareModal(value));
      return true;
    }

    if (action === "queue") {
      await interaction.deferUpdate();
      await interaction.editReply(await buildFilaItemRaroReply(panelInteraction, value));
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

  const channel = await findTextChannelByName(guild, channelName);
  if (!channel) {
    console.warn(`⚠️ Control panel channel not found: ${channelName}`);
    return false;
  }

  const pinned = await channel.messages.fetchPinned().catch(() => null);
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

function buildRegisterArchModal(item) {
  return new ModalBuilder()
    .setCustomId(`panel:register_arch:${encodePanelValue(item)}`)
    .setTitle("Registrar arma Archboss")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildRegisterRareModal(item) {
  return new ModalBuilder()
    .setCustomId(`panel:register_rare:${encodePanelValue(item)}`)
    .setTitle("Registrar item raro")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
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

  return (
    messages.find((message) => {
      const embed = message.embeds?.[0];
      return (
        message.author?.id === botUserId &&
        embed?.title === PANEL_MESSAGE_TITLE &&
        embed?.footer?.text === "TL control panel"
      );
    }) || null
  );
}

function withPanelLanguage(interaction) {
  return new Proxy(interaction, {
    get(target, prop, receiver) {
      if (prop === "commandName") return "meus_itens";
      return Reflect.get(target, prop, receiver);
    },
  });
}

function buildArchSelectReply(interaction, action) {
  return buildSelectReply({
    interaction,
    title:
      action === "register"
        ? "Selecione a arma"
        : "Selecione a arma da fila",
    description:
      action === "register"
        ? "Escolha a arma Archboss para registrar."
        : "Escolha a arma Archboss para ver a fila.",
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
        ? "Selecione o tipo de item"
        : "Selecione a categoria da fila",
    description:
      action === "register"
        ? "Escolha primeiro a categoria do item raro."
        : "Escolha primeiro a categoria do item raro da fila.",
    customId: `panel-select:rare:category:${action}`,
    options: [
      {
        label: "Armadura rara",
        value: "armor",
      },
      {
        label: "Acessório raro",
        value: "accessory",
      },
    ],
  });
}

function buildRareItemSelectReply(interaction, action, category) {
  const filtered = rareItems.filter((item) =>
    category === "armor" ? isRareArmor(item) : !isRareArmor(item)
  );

  return buildSelectReply({
    interaction,
    title:
      action === "register"
        ? "Selecione o item"
        : "Selecione o item da fila",
    description:
      action === "register"
        ? "Escolha o item raro para registrar."
        : "Escolha o item raro para ver a fila.",
    customId: `panel-select:rare:${action}`,
    options: filtered.map((item) => ({
      label: trimSelectLabel(item),
      value: item,
    })),
  });
}

function buildSelectReply({ interaction, title, description, customId, options }) {
  const embed = {
    color: 0x65b0fc,
    title,
    description,
  };

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(customId)
          .setPlaceholder("Selecione uma opção")
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(options.slice(0, 25))
      ),
    ],
  };
}

function trimSelectLabel(value) {
  return String(value || "").slice(0, 100);
}

function encodePanelValue(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function decodePanelValue(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

module.exports = {
  buildControlPanelMessage,
  ensureControlPanel,
  handleControlPanelButton,
  handleControlPanelSelect,
  handleControlPanelModal,
};
