require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");
const { ALLOWED_CHANNEL_ID, ALLOWED_CHANNEL_NAME } = require("./src/config");
const { handleAutocomplete } = require("./src/handlers/autocomplete");
const { handleWishlistButton } = require("./src/handlers/buttons");
const { commandHandlers } = require("./src/handlers");
const {
  ensureControlPanel,
  handleControlPanelButton,
  handleControlPanelSelect,
  handleControlPanelModal,
} = require("./src/handlers/panel");
const { appendCommandLog } = require("./src/logging");
const { buildWarningItemReply } = require("./src/responses");
const { isAllowedChannel, tr } = require("./src/utils");
const { validateRequiredEnv } = require("./src/env");

validateRequiredEnv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let healthServer = null;

function startHealthServer() {
  const port = process.env.PORT;
  if (!port) return;

  healthServer = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const ready = client.isReady();
      res.writeHead(ready ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: ready, ready }));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  healthServer.listen(port, () => {
    console.log(`✅ Healthcheck listening on port ${port}`);
  });
}

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  client.destroy();

  if (!healthServer) {
    process.exit(0);
    return;
  }

  healthServer.close(() => {
    process.exit(0);
  });
}

client.once("clientReady", async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  await ensureControlPanel(client, ALLOWED_CHANNEL_NAME).catch((err) => {
    console.error("❌ Failed to ensure control panel:", err);
  });
});

client.on("interactionCreate", async (interaction) => {
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
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: "Erro ao processar a seleção.",
          ephemeral: true,
        });
      }
      return interaction.followUp({
        content: "Erro ao processar a seleção.",
        ephemeral: true,
      });
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
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startHealthServer();

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login to Discord:", err);
  process.exit(1);
});

function getAllowedChannelLabel() {
  return ALLOWED_CHANNEL_ID ? `<#${ALLOWED_CHANNEL_ID}>` : `#${ALLOWED_CHANNEL_NAME}`;
}
