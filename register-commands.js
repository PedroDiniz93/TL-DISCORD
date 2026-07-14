require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { buildCommands } = require("./src/commands");
const { validateRequiredEnv } = require("./src/env");

validateRequiredEnv();

const GUILD_ID = String(process.env.GUILD_ID || "").trim();

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const commands = buildCommands().map((command) => command.toJSON());

  if (!GUILD_ID) {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Global application commands registered.");
    return;
  }

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: [],
  });

  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID),
    {
      body: commands,
    }
  );

  console.log("✅ Guild commands registered.");
})();
