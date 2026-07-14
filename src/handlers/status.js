const { EmbedBuilder } = require("discord.js");
const {
  COMMAND_LOG_PATH,
  LOG_DIR,
  LOOT_HISTORY_LOG_PATH,
  QUEUE_VIEWS_LOG_PATH,
} = require("../config");
const { getAdminRoleLabel, hasAdminRole } = require("../permissions");
const { buildWarningItemReply } = require("../responses");
const { getArchRows, getRareItemRows } = require("../wishlist-repository");
const { getStorageDriver } = require("../env");

async function handleStatusBot(interaction) {
  if (!(await hasAdminRole(interaction))) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Acesso negado",
        description: `Apenas membros com cargo ${getAdminRoleLabel()} podem ver o status do bot.`,
      })
    );
  }

  const startedAt = new Date(Date.now() - process.uptime() * 1000);
  const memory = process.memoryUsage();
  const storageStatus = await getStorageStatus();
  const storageLabel = getStorageDriver() === "sheets" ? "Google Sheets" : "PostgreSQL";

  const embed = new EmbedBuilder()
    .setColor(storageStatus.ok ? 0x57c785 : 0xd9826b)
    .setTitle("Status do bot")
    .addFields(
      {
        name: "Discord",
        value: interaction.client.isReady() ? "Online" : "Conectando/indisponivel",
        inline: true,
      },
      {
        name: "Uptime",
        value: formatDuration(process.uptime()),
        inline: true,
      },
      {
        name: "Iniciado em",
        value: startedAt.toISOString(),
        inline: false,
      },
      {
        name: storageLabel,
        value: storageStatus.ok ? "Conectado" : `Erro: ${storageStatus.error}`,
        inline: false,
      },
      {
        name: "Registros",
        value: `Archboss: ${storageStatus.archCount}\nItens raros: ${storageStatus.rareCount}`,
        inline: true,
      },
      {
        name: "Memoria",
        value: `RSS: ${formatBytes(memory.rss)}\nHeap: ${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}`,
        inline: true,
      },
      {
        name: "Logs",
        value: [
          `Diretorio: ${LOG_DIR}`,
          `Comandos: ${COMMAND_LOG_PATH}`,
          `Loot: ${LOOT_HISTORY_LOG_PATH}`,
          `Filas: ${QUEUE_VIEWS_LOG_PATH}`,
        ].join("\n"),
        inline: false,
      }
    )
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}

async function getStorageStatus() {
  try {
    const [archRows, rareRows] = await Promise.all([getArchRows(), getRareItemRows()]);
    return {
      ok: true,
      archCount: archRows.length,
      rareCount: rareRows.length,
      error: "",
    };
  } catch (err) {
    return {
      ok: false,
      archCount: 0,
      rareCount: 0,
      error: String(err?.message || err),
    };
  }
}

function formatDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds % 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

module.exports = {
  handleStatusBot,
};
