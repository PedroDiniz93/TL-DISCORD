const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { buildControlPanelReply, buildWarningItemReply } = require("../responses");
const { buildFilaArchReply, registerArchWeapon } = require("./arch");
const { buildFilaItemRaroReply, registerRareItem } = require("./rare-items");
const { buildMyItemsForInteraction } = require("./my-items");
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
    await interaction.showModal(buildRegisterArchModal());
    return true;
  }

  if (action === "register_rare") {
    await interaction.showModal(buildRegisterRareModal());
    return true;
  }

  if (action === "queue_arch") {
    await interaction.showModal(buildQueueArchModal());
    return true;
  }

  if (action === "queue_rare") {
    await interaction.showModal(buildQueueRareModal());
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

async function handleControlPanelModal(interaction) {
  const [scope, action] = String(interaction.customId || "").split(":");
  if (scope !== "panel") return false;

  const panelInteraction = withPanelLanguage(interaction);
  await interaction.deferReply({ ephemeral: true });

  if (action === "register_arch") {
    const nick = interaction.fields.getTextInputValue("nick");
    const arma = interaction.fields.getTextInputValue("arch_weapon");
    return interaction.editReply(
      await registerArchWeapon({
        interaction: panelInteraction,
        nick,
        arma,
      })
    );
  }

  if (action === "register_rare") {
    const nick = interaction.fields.getTextInputValue("nick");
    const item = interaction.fields.getTextInputValue("rare_item");
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
  if (!channel) return false;

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

function buildRegisterArchModal() {
  return new ModalBuilder()
    .setCustomId("panel:register_arch")
    .setTitle("Registrar arma Archboss")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("arch_weapon")
          .setLabel("Arma Archboss")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildRegisterRareModal() {
  return new ModalBuilder()
    .setCustomId("panel:register_rare")
    .setTitle("Registrar item raro")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nick")
          .setLabel("Nick")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("rare_item")
          .setLabel("Item raro")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildQueueArchModal() {
  return new ModalBuilder()
    .setCustomId("panel:queue_arch")
    .setTitle("Ver fila Archboss")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("arch_weapon")
          .setLabel("Arma Archboss")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

function buildQueueRareModal() {
  return new ModalBuilder()
    .setCustomId("panel:queue_rare")
    .setTitle("Ver fila item raro")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("rare_item")
          .setLabel("Item raro")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

async function findTextChannelByName(guild, channelName) {
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return null;

  return (
    channels.find(
      (channel) =>
        channel &&
        channel.isTextBased?.() &&
        "name" in channel &&
        channel.name === channelName
    ) || null
  );
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

module.exports = {
  buildControlPanelMessage,
  ensureControlPanel,
  handleControlPanelButton,
  handleControlPanelModal,
};
