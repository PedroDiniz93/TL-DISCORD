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
};

module.exports = {
  commandHandlers,
};
