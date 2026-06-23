const fs = require("fs/promises");
const {
  COMMAND_LOG_PATH,
  LOG_DIR,
  LOOT_HISTORY_LOG_PATH,
  QUEUE_VIEWS_LOG_PATH,
} = require("./config");
const {
  getUserDisplayName,
  interactionOptionsToSimpleArray,
  nowBrasilia,
  safeJsonStringify,
} = require("./utils");

async function appendCommandLog({ interaction, status, err }) {
  try {
    const entry = {
      timestamp: nowBrasilia(),
      discordUserId: interaction.user?.id ?? "",
      name: getUserDisplayName(interaction.user),
      command: getInteractionSource(interaction),
      guildId: interaction.guildId ?? "",
      channelId: interaction.channelId ?? "",
      options: interactionOptionsToSimpleArray(interaction),
      status,
      error: err ? String(err?.message ?? err) : "",
    };

    console.log(`[COMMAND_LOG] ${safeJsonStringify(entry)}`);
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(COMMAND_LOG_PATH, `${safeJsonStringify(entry)}\n`, "utf8");
  } catch (e) {
    console.error("❌ Failed to write command log:", e);
  }
}

async function appendLootHistoryLog({ interaction, action, itemType, item, nick }) {
  try {
    const entry = {
      timestamp: nowBrasilia(),
      action,
      itemType,
      item,
      nick,
      discordUserId: interaction.user?.id ?? "",
      name: getUserDisplayName(interaction.user),
      source: getInteractionSource(interaction),
      guildId: interaction.guildId ?? "",
      channelId: interaction.channelId ?? "",
      channelName: interaction.channel?.name ?? "",
    };

    console.log(`[LOOT_HISTORY] ${safeJsonStringify(entry)}`);
    await appendJsonLine(LOOT_HISTORY_LOG_PATH, entry);
  } catch (e) {
    console.error("❌ Failed to write loot history log:", e);
  }
}

async function appendQueueViewLog({ interaction, itemType, item }) {
  try {
    const entry = {
      timestamp: nowBrasilia(),
      itemType,
      item,
      discordUserId: interaction.user?.id ?? "",
      name: getUserDisplayName(interaction.user),
      source: getInteractionSource(interaction),
      guildId: interaction.guildId ?? "",
      channelId: interaction.channelId ?? "",
      channelName: interaction.channel?.name ?? "",
    };

    console.log(`[QUEUE_VIEW] ${safeJsonStringify(entry)}`);
    await appendJsonLine(QUEUE_VIEWS_LOG_PATH, entry);
  } catch (e) {
    console.error("❌ Failed to write queue view log:", e);
  }
}

async function appendJsonLine(filePath, entry) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(filePath, `${safeJsonStringify(entry)}\n`, "utf8");
}

function getInteractionSource(interaction) {
  return interaction.commandName || interaction.customId || "";
}

module.exports = {
  appendCommandLog,
  appendLootHistoryLog,
  appendQueueViewLog,
};
