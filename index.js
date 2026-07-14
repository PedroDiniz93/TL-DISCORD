require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { handleAutocomplete } = require("./src/handlers/autocomplete");
const { handleWishlistButton } = require("./src/handlers/buttons");
const { commandHandlers } = require("./src/handlers");
const {
  ensureConfiguredControlPanels,
  handleControlPanelButton,
  handleControlPanelSelect,
  handleControlPanelModal,
} = require("./src/handlers/panel");
const { appendCommandLog } = require("./src/logging");
const { buildWarningItemReply } = require("./src/responses");
const { closePool } = require("./src/db");
const { isAllowedChannelForInteraction } = require("./src/guild-settings");
const { runWithInteractionContext } = require("./src/interaction-context");
const { startWebServer, stopWebServer } = require("./src/web/server");
const { tr } = require("./src/utils");
const { validateRequiredEnv } = require("./src/env");

validateRequiredEnv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  client.destroy();
  await stopWebServer().catch((err) => {
    console.error("❌ Failed to stop web server:", err);
  });
  await closePool().catch((err) => {
    console.error("❌ Failed to close database pool:", err);
  });
  process.exit(0);
}

function isUnknownInteractionError(err) {
  return err?.code === 10062 || err?.rawError?.code === 10062;
}

async function replyToSelectMenuError(interaction) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: "Erro ao processar a seleção.",
        ephemeral: true,
      });
    }

    return await interaction.followUp({
      content: "Erro ao processar a seleção.",
      ephemeral: true,
    });
  } catch (err) {
    if (isUnknownInteractionError(err)) {
      console.warn("⚠️ Select menu interaction expired before the error reply could be sent.");
      return false;
    }
    throw err;
  }
}

client.once("clientReady", async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  await ensureConfiguredControlPanels(client).catch((err) => {
    console.error("❌ Failed to ensure configured control panels:", err);
  });
});

client.on("interactionCreate", (interaction) => runWithInteractionContext(interaction, async () => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    try {
      const handled = await handleControlPanelSelect(interaction);
      if (handled) {
        await appendCommandLog({
          interaction,
          status: "OK",
          err: null,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("❌ Error while processing select menu:", err);
      await appendCommandLog({
        interaction,
        status: "ERROR",
        err,
      });

      if (isUnknownInteractionError(err)) {
        console.warn("⚠️ Select menu interaction expired before the bot could respond.");
        return false;
      }

      return replyToSelectMenuError(interaction);
    }
  }

  if (interaction.isButton()) {
    let hasDeferred = false;
    try {
      const panelHandled = await handleControlPanelButton(interaction);
      if (panelHandled) {
        await appendCommandLog({
          interaction,
          status: "OK",
          err: null,
        });
        return true;
      }

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

  if (interaction.isModalSubmit()) {
    try {
      const handled = await handleControlPanelModal(interaction);
      if (handled) {
        await appendCommandLog({
          interaction,
          status: "OK",
          err: null,
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("❌ Error while processing modal:", err);
      const errorReply = buildWarningItemReply({
        interaction,
        title: tr(interaction, "❌ Erro ao processar", "❌ Processing error"),
        description: tr(
          interaction,
          "Erro ao processar o formulário. Veja os logs do bot.",
          "Error while processing the form. Check bot logs."
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
      if (interaction.deferred) {
        return interaction.editReply(errorReply);
      }
      return interaction.reply({
        ...errorReply,
        ephemeral: true,
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  if (!(await isAllowedChannelForInteraction(interaction))) {
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
          `Este bot só pode ser usado no canal ${getAllowedChannelLabel()}.`,
          `This bot can only be used in ${getAllowedChannelLabel()}.`
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
}));

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startWebServer({ client });

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login to Discord:", err);
  process.exit(1);
});

function getAllowedChannelLabel() {
  return ALLOWED_CHANNEL_ID ? `<#${ALLOWED_CHANNEL_ID}>` : `#${ALLOWED_CHANNEL_NAME}`;
}
