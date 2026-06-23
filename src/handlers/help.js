const { buildHelpReply } = require("../responses");

async function handleHelp(interaction) {
  return interaction.editReply(buildHelpReply({ interaction }));
}

module.exports = {
  handleHelp,
};
