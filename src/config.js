const path = require("path");

const ARCH_SHEET = {
  title: "LISTA DESEJO ARCH",
  headers: ["Data", "Nick", "Arma", "DiscordUserId"],
};

const RARE_ITEM_SHEET = {
  title: "LISTA DESEJO ITEM RARO",
  headers: ["Data", "Nick", "Item", "DiscordUserId"],
};

const HEADER_BG = { red: 0.05, green: 0.15, blue: 0.35 };
const HEADER_FG = { red: 1, green: 1, blue: 1 };

const ALLOWED_CHANNEL_NAME = "🎢planilha-arch-boss";

const PT_BR_COMMANDS = new Set([
  "arma_arch",
  "listar_arch",
  "remover_arch",
  "fila_arch",
  "item_raro",
  "remover_item_raro",
  "fila_item_raro",
  "meus_itens",
  "ajuda",
]);

const LOG_DIR = path.join(__dirname, "..", "logs");
const COMMAND_LOG_PATH = path.join(LOG_DIR, "commands.log");
const LOOT_HISTORY_LOG_PATH = path.join(LOG_DIR, "loot-history.log");
const QUEUE_VIEWS_LOG_PATH = path.join(LOG_DIR, "queue-views.log");

module.exports = {
  ALLOWED_CHANNEL_NAME,
  ARCH_SHEET,
  COMMAND_LOG_PATH,
  HEADER_BG,
  HEADER_FG,
  LOOT_HISTORY_LOG_PATH,
  LOG_DIR,
  PT_BR_COMMANDS,
  QUEUE_VIEWS_LOG_PATH,
  RARE_ITEM_SHEET,
};
