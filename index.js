require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { ALLOWED_CHANNEL_NAME } = require("./src/config");
const { handleAutocomplete } = require("./src/handlers/autocomplete");
const { commandHandlers } = require("./src/handlers");
const { appendCommandLog } = require("./src/logging");
const { isAllowedChannel, tr } = require("./src/utils");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (!isAllowedChannel(interaction)) {
    await appendCommandLog({
      interaction,
      status: "BLOCKED_CHANNEL",
      err: null,
    });

    return interaction.reply({
      content: tr(
        interaction,
        `❌ Este bot só pode ser usado no canal #${ALLOWED_CHANNEL_NAME}.`,
        `❌ This bot can only be used in #${ALLOWED_CHANNEL_NAME}.`
      ),
      ephemeral: true,
    });
  }

  let hasDeferred = false;
  try {
    await interaction.deferReply({ ephemeral: true });
    hasDeferred = true;

    const handler = commandHandlers[interaction.commandName];
    if (!handler) {
      await appendCommandLog({
        interaction,
        status: "UNKNOWN_COMMAND",
        err: null,
      });
      return interaction.editReply(
        tr(
          interaction,
          "❌ Comando não suportado por este bot.",
          "❌ This command is not supported by this bot."
        )
      );
    }

    const result = await handler(interaction);
    await appendCommandLog({
      interaction,
      status: "OK",
      err: null,
    });
    return result;
  } catch (err) {
    console.error("❌ Error while processing command:", err);
    const errorMsg = tr(
      interaction,
      "❌ Erro ao registrar. Veja os logs do bot.",
      "❌ Error while registering. Check bot logs."
    );
    await appendCommandLog({
      interaction,
      status: "ERROR",
      err,
    });

    if (interaction.replied) {
      return interaction.followUp({
        content: errorMsg,
        ephemeral: true,
      });
    }
    if (hasDeferred || interaction.deferred) {
      return interaction.editReply(errorMsg);
    }
    return interaction.reply({
      content: errorMsg,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
