const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function runWithInteractionContext(interaction, callback) {
  return storage.run(
    {
      guildId: String(interaction?.guildId || process.env.GUILD_ID || "").trim(),
      channelId: String(interaction?.channelId || "").trim(),
      userId: String(interaction?.user?.id || "").trim(),
    },
    callback
  );
}

function getCurrentGuildId() {
  return String(storage.getStore()?.guildId || process.env.GUILD_ID || "").trim();
}

function getCurrentUserId() {
  return String(storage.getStore()?.userId || "").trim();
}

module.exports = {
  getCurrentGuildId,
  getCurrentUserId,
  runWithInteractionContext,
};
