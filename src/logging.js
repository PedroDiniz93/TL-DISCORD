const fs = require("fs/promises");
const { COMMAND_LOG_PATH, LOG_DIR } = require("./config");
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
      command: interaction.commandName ?? "",
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

module.exports = {
  appendCommandLog,
};
