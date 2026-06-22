require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { ALLOWED_CHANNEL_NAME } = require("./src/config");
const { handleAutocomplete } = require("./src/handlers/autocomplete");
const { handleWishlistButton } = require("./src/handlers/buttons");
const { commandHandlers } = require("./src/handlers");
const { appendCommandLog } = require("./src/logging");
const { buildWarningItemReply } = require("./src/responses");
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

  if (interaction.isButton()) {
    let hasDeferred = false;
    try {
      await interaction.deferReply({ ephemeral: true });
      hasDeferred = true;

      const handled = await handleWishlistButton(interaction);
      await appendCommandLog({
        interaction,
        status: handled ? "OK" : "UNKNOWN_BUTTON",
        err: null,
      });
      if (handled) return true;

      return interaction.editReply(
        buildWarningItemReply({
          interaction,
          title: tr(interaction, "⚠️ Botão não suportado", "⚠️ Unsupported button"),
          description: tr(
            interaction,
            "Esse botão não é suportado por este bot.",
            "This button is not supported by this bot."
          ),
        })
      );
    } catch (err) {
      console.error("❌ Error while processing button:", err);
      const errorReply = buildWarningItemReply({
        interaction,
        title: tr(interaction, "❌ Erro ao processar", "❌ Processing error"),
        description: tr(
          interaction,
          "Erro ao processar o botão. Veja os logs do bot.",
          "Error while processing the button. Check bot logs."
        ),
      });
      await appendCommandLog({
        interaction,
        status: "ERROR",
        err,
      });

      if (interaction.replied) {
        return interaction.followUp({
          ...errorReply,
          ephemeral: true,
        });
      }
      if (hasDeferred || interaction.deferred) {
        return interaction.editReply(errorReply);
      }
      return interaction.reply({
        ...errorReply,
        ephemeral: true,
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  if (!isAllowedChannel(interaction)) {
    await appendCommandLog({
      interaction,
      status: "BLOCKED_CHANNEL",
      err: null,
    });

    return interaction.reply({
      ...buildWarningItemReply({
        interaction,
        title: tr(interaction, "❌ Canal incorreto", "❌ Wrong channel"),
        description: tr(
          interaction,
          `Este bot só pode ser usado no canal #${ALLOWED_CHANNEL_NAME}.`,
          `This bot can only be used in #${ALLOWED_CHANNEL_NAME}.`
        ),
      }),
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
        buildWarningItemReply({
          interaction,
          title: tr(interaction, "❌ Comando não suportado", "❌ Unsupported command"),
          description: tr(
            interaction,
            "Comando não suportado por este bot.",
            "This command is not supported by this bot."
          ),
        })
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
    const errorReply = buildWarningItemReply({
      interaction,
      title: tr(interaction, "❌ Erro ao processar", "❌ Processing error"),
      description: tr(
        interaction,
        "Erro ao registrar. Veja os logs do bot.",
        "Error while registering. Check bot logs."
      ),
    });
    await appendCommandLog({
      interaction,
      status: "ERROR",
      err,
    });

    if (interaction.replied) {
      return interaction.followUp({
        ...errorReply,
        ephemeral: true,
      });
    }
    if (hasDeferred || interaction.deferred) {
      return interaction.editReply(errorReply);
    }
    return interaction.reply({
      ...errorReply,
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
