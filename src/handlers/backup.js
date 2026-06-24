const { AttachmentBuilder } = require("discord.js");
const {
  ARCH_GAIN_HISTORY_SHEET,
  ARCH_SHEET,
  RARE_ITEM_GAIN_HISTORY_SHEET,
  RARE_ITEM_SHEET,
} = require("../config");
const { getAdminRoleLabel, hasAdminRole } = require("../permissions");
const { buildWarningItemReply } = require("../responses");
const {
  getArchHistoryRows,
  getArchRows,
  getRareItemHistoryRows,
  getRareItemRows,
} = require("../wishlist-repository");

async function handleAdminBackupPlanilha(interaction) {
  if (!(await hasAdminRole(interaction))) {
    return interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: "Acesso negado",
        description: `Apenas membros com cargo ${getAdminRoleLabel()} podem gerar backup da planilha.`,
      })
    );
  }

  const backupDate = buildBackupDate();
  const files = await buildBackupFiles(backupDate);
  const totalRows = files.reduce((sum, file) => sum + file.rowCount, 0);

  return interaction.editReply({
    content: `Backup gerado com ${totalRows} registro(s) em ${files.length} arquivo(s).`,
    files: files.map((file) => file.attachment),
  });
}

async function buildBackupFiles(backupDate) {
  const [archRows, rareRows, archHistoryRows, rareHistoryRows] = await Promise.all([
    getArchRows(),
    getRareItemRows(),
    getArchHistoryRows(),
    getRareItemHistoryRows(),
  ]);

  return [
    buildCsvAttachment({
      name: `${backupDate}-lista-desejo-arch.csv`,
      sheet: ARCH_SHEET,
      rows: archRows,
    }),
    buildCsvAttachment({
      name: `${backupDate}-lista-desejo-item-raro.csv`,
      sheet: RARE_ITEM_SHEET,
      rows: rareRows,
    }),
    buildCsvAttachment({
      name: `${backupDate}-historico-arch-boss.csv`,
      sheet: ARCH_GAIN_HISTORY_SHEET,
      rows: archHistoryRows,
    }),
    buildCsvAttachment({
      name: `${backupDate}-historico-item-raro.csv`,
      sheet: RARE_ITEM_GAIN_HISTORY_SHEET,
      rows: rareHistoryRows,
    }),
  ];
}

function buildCsvAttachment({ name, sheet, rows }) {
  const csv = rowsToCsv(sheet.headers, rows);
  return {
    rowCount: rows.length,
    attachment: new AttachmentBuilder(Buffer.from(csv, "utf8"), {
      name,
    }),
  };
}

function rowsToCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header] || "")).join(",")
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildBackupDate() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  handleAdminBackupPlanilha,
};
