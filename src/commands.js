const { PermissionsBitField, SlashCommandBuilder } = require("discord.js");

function buildCommands() {
  const weaponArchCmdEn = new SlashCommandBuilder()
    .setName("weapon_arch")
    .setDescription("Register an Archboss weapon in your wishlist")
    .addStringOption((o) =>
      o.setName("nickname").setDescription("Character nickname").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("arch_weapon")
        .setDescription("Archboss weapon")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const weaponArchCmdPt = new SlashCommandBuilder()
    .setName("arma_arch")
    .setDescription("Registrar arma Archboss na lista de desejo")
    .addStringOption((o) => o.setName("nick").setDescription("Nick").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("arma_arch")
        .setDescription("Arma Archboss")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const listarArchCmd = new SlashCommandBuilder()
    .setName("list_arch")
    .setDescription("Show your Archboss wishlist registrations");

  const listarArchCmdPt = new SlashCommandBuilder()
    .setName("listar_arch")
    .setDescription("Mostra seus registros da lista Archboss");

  const removerArchCmd = new SlashCommandBuilder()
    .setName("remove_arch")
    .setDescription("Remove an item from your Archboss wishlist")
    .addStringOption((o) =>
      o
        .setName("arch_weapon")
        .setDescription("Weapon to remove")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const removerArchCmdPt = new SlashCommandBuilder()
    .setName("remover_arch")
    .setDescription("Remove um item da sua lista de desejo Archboss")
    .addStringOption((o) =>
      o
        .setName("arma_arch")
        .setDescription("Arma a ser removida")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const filaArchCmd = new SlashCommandBuilder()
    .setName("arch_queue")
    .setDescription("Show the player queue for a specific Archboss weapon")
    .addStringOption((o) =>
      o
        .setName("arch_weapon")
        .setDescription("Archboss weapon")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const filaArchCmdPt = new SlashCommandBuilder()
    .setName("fila_arch")
    .setDescription("Mostra a fila de jogadores para uma arma Archboss específica")
    .addStringOption((o) =>
      o
        .setName("item")
        .setDescription("Arma Archboss")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const itemRaroCmd = new SlashCommandBuilder()
    .setName("rare_item")
    .setDescription("Register a rare item in your wishlist")
    .addStringOption((o) =>
      o.setName("nickname").setDescription("Character nickname").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("rare_item")
        .setDescription("Rare item")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const itemRaroCmdPt = new SlashCommandBuilder()
    .setName("item_raro")
    .setDescription("Registrar item raro na lista de desejo")
    .addStringOption((o) => o.setName("nick").setDescription("Nick").setRequired(true))
    .addStringOption((o) =>
      o
        .setName("item_raro")
        .setDescription("Item raro")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const removerItemRaroCmd = new SlashCommandBuilder()
    .setName("remove_rare_item")
    .setDescription("Remove a rare item from your wishlist")
    .addStringOption((o) =>
      o
        .setName("rare_item")
        .setDescription("Rare item to remove")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const removerItemRaroCmdPt = new SlashCommandBuilder()
    .setName("remover_item_raro")
    .setDescription("Remove um item raro da sua lista de desejo")
    .addStringOption((o) =>
      o
        .setName("item_raro")
        .setDescription("Item raro a ser removido")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const filaItemCmd = new SlashCommandBuilder()
    .setName("rare_item_queue")
    .setDescription("Show the player queue for a specific rare item")
    .addStringOption((o) =>
      o
        .setName("rare_item")
        .setDescription("Rare item")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const filaItemCmdPt = new SlashCommandBuilder()
    .setName("fila_item_raro")
    .setDescription("Mostra a fila de jogadores para um item raro específico")
    .addStringOption((o) =>
      o
        .setName("item_raro")
        .setDescription("Item raro")
        .setRequired(true)
        .setAutocomplete(true)
    );

  const myItemsCmd = new SlashCommandBuilder()
    .setName("my_items")
    .setDescription("Show your Archboss weapon and rare item wishlist");

  const meusItensCmd = new SlashCommandBuilder()
    .setName("meus_itens")
    .setDescription("Mostra sua arma Archboss e seus itens raros");

  const helpCmd = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show summarized rules and available commands");

  const ajudaCmd = new SlashCommandBuilder()
    .setName("ajuda")
    .setDescription("Mostra regras resumidas e comandos disponíveis");

  const baixarLogsCmd = new SlashCommandBuilder()
    .setName("baixar_logs")
    .setDescription("Baixa os arquivos de log do bot")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator);

  return [
    weaponArchCmdEn,
    weaponArchCmdPt,
    listarArchCmd,
    listarArchCmdPt,
    removerArchCmd,
    removerArchCmdPt,
    filaArchCmd,
    filaArchCmdPt,
    itemRaroCmd,
    itemRaroCmdPt,
    removerItemRaroCmd,
    removerItemRaroCmdPt,
    filaItemCmd,
    filaItemCmdPt,
    myItemsCmd,
    meusItensCmd,
    helpCmd,
    ajudaCmd,
    baixarLogsCmd,
  ];
}

module.exports = {
  buildCommands,
};
