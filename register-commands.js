require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { buildCommands } = require("./src/commands");
const { validateRequiredEnv } = require("./src/env");

validateRequiredEnv();

const GUILD_ID = process.env.GUILD_ID;

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: [],
  });

  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID),
    {
      body: buildCommands().map((command) => command.toJSON()),
    }
  );

  console.log("✅ Guild commands registered.");
})();
