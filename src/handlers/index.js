const {
  handleArmaArch,
  handleFilaArch,
  handleListarArch,
  handleRemoverArch,
} = require("./arch");
const {
  handleFilaItemRaro,
  handleItemRaro,
  handleRemoverItemRaro,
} = require("./rare-items");
const { handleHelp } = require("./help");
const { handleBaixarLogs } = require("./logs");
const { handleMyItems } = require("./my-items");
const { handleMarcarEntregue } = require("./deliveries");
const { handleStatusBot } = require("./status");

const commandHandlers = {
  weapon_arch: handleArmaArch,
  arma_arch: handleArmaArch,
  list_arch: handleListarArch,
  listar_arch: handleListarArch,
  remove_arch: handleRemoverArch,
  remover_arch: handleRemoverArch,
  arch_queue: handleFilaArch,
  fila_arch: handleFilaArch,
  rare_item: handleItemRaro,
  item_raro: handleItemRaro,
  remove_rare_item: handleRemoverItemRaro,
  remover_item_raro: handleRemoverItemRaro,
  rare_item_queue: handleFilaItemRaro,
  fila_item_raro: handleFilaItemRaro,
  my_items: handleMyItems,
  meus_itens: handleMyItems,
  help: handleHelp,
  ajuda: handleHelp,
  baixar_logs: handleBaixarLogs,
  status_bot: handleStatusBot,
  marcar_entregue: handleMarcarEntregue,
};

module.exports = {
  commandHandlers,
};
