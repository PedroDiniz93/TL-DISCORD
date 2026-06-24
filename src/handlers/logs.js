const fs = require("fs/promises");
const path = require("path");
const { AttachmentBuilder } = require("discord.js");
const {
  COMMAND_LOG_PATH,
  LOOT_HISTORY_LOG_PATH,
  QUEUE_VIEWS_LOG_PATH,
} = require("../config");
const { getAdminRoleLabel, hasAdminRole } = require("../permissions");
const { buildWarningItemReply } = require("../responses");

const DEFAULT_ATTACHMENT_LIMIT_BYTES = 8 * 1024 * 1024;
const ATTACHMENT_LIMIT_SAFETY_RATIO = 0.95;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const LOG_FILES = [
  {
    path: COMMAND_LOG_PATH,
    name: "commands.log",
  },
  {
    path: LOOT_HISTORY_LOG_PATH,
    name: "loot-history.log",
  },
  {
    path: QUEUE_VIEWS_LOG_PATH,
    name: "queue-views.log",
  },
];

async function handleBaixarLogs(interaction) {
  if (!(await hasAdminRole(interaction))) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Acesso negado",
        description: `Apenas membros com cargo ${getAdminRoleLabel()} podem baixar os logs do bot.`,
      })
    );
  }

  const maxChunkBytes = getMaxLogChunkBytes(interaction);
  const { attachments, missingFiles } = await buildLogAttachments(maxChunkBytes);

  if (!attachments.length) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Logs indisponíveis",
        description: missingFiles.length
          ? `Nenhum arquivo de log foi encontrado. Ausentes: ${missingFiles.join(", ")}.`
          : "Nenhum arquivo de log foi encontrado.",
      })
    );
  }

  const summary = [
    `Enviando ${attachments.length} arquivo(s) de log.`,
    missingFiles.length ? `Arquivos ainda não criados: ${missingFiles.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const batches = chunkArray(attachments, MAX_ATTACHMENTS_PER_MESSAGE);
  await interaction.editReply({
    content: summary,
    files: batches[0],
  });

  for (const batch of batches.slice(1)) {
    await interaction.followUp({
      content: "Continuação dos logs.",
      files: batch,
      ephemeral: true,
    });
  }
}

function getMaxLogChunkBytes(interaction) {
  const rawLimit = Number(interaction.attachmentSizeLimit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? rawLimit
    : DEFAULT_ATTACHMENT_LIMIT_BYTES;
  return Math.max(1, Math.floor(limit * ATTACHMENT_LIMIT_SAFETY_RATIO));
}

async function buildLogAttachments(maxChunkBytes) {
  const attachments = [];
  const missingFiles = [];

  for (const file of LOG_FILES) {
    const buffer = await readLogFile(file.path);
    if (!buffer) {
      missingFiles.push(file.name);
      continue;
    }

    splitBuffer(buffer, maxChunkBytes).forEach((chunk, index, chunks) => {
      const attachmentName =
        chunks.length === 1 ? file.name : buildPartFileName(file.name, index + 1);
      attachments.push(
        new AttachmentBuilder(chunk, {
          name: attachmentName,
        })
      );
    });
  }

  return {
    attachments,
    missingFiles,
  };
}

async function readLogFile(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (err) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

function splitBuffer(buffer, maxChunkBytes) {
  if (buffer.length <= maxChunkBytes) return [buffer];

  const chunks = [];
  for (let offset = 0; offset < buffer.length; offset += maxChunkBytes) {
    chunks.push(buffer.subarray(offset, offset + maxChunkBytes));
  }
  return chunks;
}

function buildPartFileName(fileName, partNumber) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  return `${base}-${partNumber}${ext}`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

module.exports = {
  handleBaixarLogs,
};
