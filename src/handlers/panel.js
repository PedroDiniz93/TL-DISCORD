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
const { ALLOWED_CHANNEL_ID, ALLOWED_CHANNEL_NAME } = require("../config");
const { getConfiguredPanelGuilds } = require("../guild-settings");
const { buildFilaArchReply, registerArchWeapon } = require("./arch");
const { buildFilaItemRaroReply, registerRareItem } = require("./rare-items");
const { buildItemInfoReply } = require("./item-info");
const { buildMyItemsForInteraction } = require("./my-items");
const { findKnownItemByHash, getItemInfo } = require("../item-info-service");
const {
  getActiveItemsByType,
  getCatalog,
} = require("../item-catalog");
const { shortStableHash, tr } = require("../utils");

const PANEL_MESSAGE_TITLES = new Set([
  "Painel Archboss",
  "Archboss Panel",
  "Painel Archboss / Archboss Panel",
]);
const RARE_PANEL_PAGE_SIZE = 25;
const RARE_PANEL_VISIBLE_PAGE_BUTTONS = 10;
const DISCORD_BUTTONS_PER_ROW = 5;

function buildControlPanelMessage() {
  return buildControlPanelReply({ locale: "bilingual" });
}

async function handleControlPanelButton(interaction) {
  const [scope, action] = String(interaction.customId || "").split(":");
  if (scope !== "panel") return false;

  const panelInteraction = withPanelLanguage(interaction);

  if (action === "register_arch") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(await buildArchSelectReply(panelInteraction, "register"));
    return true;
  }

  if (action === "register_rare") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(await buildRareCategorySelectReply(panelInteraction, "register"));
    return true;
  }

  if (action === "queue_arch") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(await buildArchSelectReply(panelInteraction, "queue"));
    return true;
  }

  if (action === "queue_rare") {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply(await buildRareCategorySelectReply(panelInteraction, "queue"));
    return true;
  }

  if (action === "back") {
    const target = String(interaction.customId || "")
      .split(":")
      .slice(2)
      .join(":") || "home";
    await interaction.update(await buildPanelBackReply(panelInteraction, target));
    return true;
  }

  if (action === "rare_page") {
    const [, , rareAction = "register", category = "accessory", page = "0"] =
      String(interaction.customId || "").split(":");
    await interaction.deferUpdate();
    await interaction.editReply(
      await buildRareItemSelectReply(
        panelInteraction,
        rareAction,
        category,
        Number(page) || 0
      )
    );
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
        await buildRareItemSelectReply(panelInteraction, step, value)
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

async function ensureConfiguredControlPanels(client) {
  const configuredGuilds = await getConfiguredPanelGuilds();
  const targets = configuredGuilds.length
    ? configuredGuilds
    : process.env.GUILD_ID
      ? [{ discordGuildId: process.env.GUILD_ID, allowedChannelId: ALLOWED_CHANNEL_ID }]
      : [];

  let ensured = 0;
  for (const target of targets) {
    const ok = await ensureControlPanel(client, {
      guildId: target.discordGuildId,
      channelId: target.allowedChannelId,
      channelName: ALLOWED_CHANNEL_NAME,
    }).catch((err) => {
      console.error(`❌ Failed to ensure control panel for guild ${target.discordGuildId}:`, err);
      return false;
    });
    if (ok) ensured++;
  }
  return ensured;
}

async function ensureControlPanel(client, options = {}) {
  const guildId = String(options.guildId || process.env.GUILD_ID || "").trim();
  if (!guildId) return false;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channelId = String(options.channelId || ALLOWED_CHANNEL_ID || "").trim();
  const channelName = String(options.channelName || ALLOWED_CHANNEL_NAME || "").trim();
  const channel = channelId
    ? await findTextChannelById(guild, channelId)
    : await findTextChannelByName(guild, channelName);
  if (!channel) {
    console.warn(
      `⚠️ Control panel channel not found for guild ${guildId}: ${channelId || channelName}`
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

function buildRegisterArchModal(item) {
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
          .setRequired(false)
      )
    );
}

function buildRegisterRareModal(item) {
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
          .setRequired(false)
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

async function buildArchSelectReply(interaction, action) {
  const items = await getActiveItemsByType(interaction.guildId, "arch");
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
    options: items.map((item) => ({
      label: trimSelectLabel(item.name),
      value: item.name,
    })),
  });
}

async function buildRareCategorySelectReply(interaction, action) {
  const catalog = await getCatalog(interaction.guildId);
  const categories = catalog.categories.filter((category) => category.type === "rare" && category.active);
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
    options: categories.map((category) => ({
      label: trimSelectLabel(category.name),
      value: category.key,
    })),
  });
}

async function buildRareItemSelectReply(interaction, action, category, page = 0) {
  const catalog = await getCatalog(interaction.guildId);
  const filtered = catalog.items.filter(
    (item) => item.type === "rare" && item.active && item.categoryKey === category
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / RARE_PANEL_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  const pageItems = filtered.slice(
    currentPage * RARE_PANEL_PAGE_SIZE,
    (currentPage + 1) * RARE_PANEL_PAGE_SIZE
  );
  const pageLabel =
    filtered.length > RARE_PANEL_PAGE_SIZE
      ? tr(
          interaction,
          ` Página ${currentPage + 1}/${totalPages}.`,
          ` Page ${currentPage + 1}/${totalPages}.`
        )
      : "";

  const reply = buildSelectReply({
    interaction,
    title:
      action === "register"
        ? tr(interaction, "Selecione o item", "Select item")
        : tr(interaction, "Selecione o item da fila", "Select queue item"),
    description:
      action === "register"
        ? tr(
            interaction,
            `Escolha o item raro para registrar.${pageLabel}`,
            `Choose the rare item to register.${pageLabel}`
          )
        : tr(
            interaction,
            `Escolha o item raro para ver a fila.${pageLabel}`,
            `Choose the rare item to view the queue.${pageLabel}`
          ),
    customId: `panel-select:rare:${action}`,
    backTarget: `rare_category:${action}`,
    options: pageItems.map((item) => ({
      label: trimSelectLabel(item.name),
      value: item.name,
    })),
  });

  if (filtered.length > RARE_PANEL_PAGE_SIZE) {
    reply.components.splice(
      1,
      0,
      ...buildRarePageButtonRows({
        action,
        category,
        currentPage,
        totalPages,
      })
    );
  }

  return reply;
}

function buildRarePageButtonRows({ action, category, currentPage, totalPages }) {
  if (totalPages <= RARE_PANEL_VISIBLE_PAGE_BUTTONS) {
    return chunkArray(
      Array.from({ length: totalPages }, (_, page) =>
        buildRarePageButton({ action, category, currentPage, page })
      ),
      DISCORD_BUTTONS_PER_ROW
    ).map((buttons) => new ActionRowBuilder().addComponents(...buttons));
  }

  const pageWindow = buildCenteredPageWindow(currentPage, totalPages, 3);
  const buttons = [
    buildRarePageButton({
      action,
      category,
      currentPage,
      page: Math.max(currentPage - 1, 0),
      label: "‹",
      disabled: currentPage <= 0,
    }),
    ...pageWindow.map((page) =>
      buildRarePageButton({ action, category, currentPage, page })
    ),
    buildRarePageButton({
      action,
      category,
      currentPage,
      page: Math.min(currentPage + 1, totalPages - 1),
      label: "›",
      disabled: currentPage >= totalPages - 1,
    }),
  ];

  return [new ActionRowBuilder().addComponents(...buttons)];
}

function buildRarePageButton({
  action,
  category,
  currentPage,
  page,
  label = String(page + 1),
  disabled = page === currentPage,
}) {
  return new ButtonBuilder()
    .setCustomId(`panel:rare_page:${action}:${category}:${page}`)
    .setLabel(label)
    .setStyle(page === currentPage ? ButtonStyle.Primary : ButtonStyle.Secondary)
    .setDisabled(disabled);
}

function buildCenteredPageWindow(currentPage, totalPages, size) {
  const maxStart = Math.max(totalPages - size, 0);
  const start = Math.min(Math.max(currentPage - Math.floor(size / 2), 0), maxStart);
  return Array.from({ length: Math.min(size, totalPages) }, (_, index) => start + index);
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

async function buildPanelBackReply(interaction, target) {
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
  return Buffer.from(String(value || ""), "utf8").toString("base64url");
}

function decodePanelValue(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

module.exports = {
  buildControlPanelMessage,
  ensureConfiguredControlPanels,
  ensureControlPanel,
  handleControlPanelButton,
  handleControlPanelSelect,
  handleControlPanelModal,
};
