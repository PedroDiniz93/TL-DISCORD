require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID;

const armaArchCmd = new SlashCommandBuilder()
    .setName("arma_arch")
    .setDescription("Registrar arma Archboss na lista de desejo")
    .addStringOption((o) =>
        o.setName("nick").setDescription("Nick").setRequired(true)
    )
    .addStringOption((o) =>
        o
            .setName("arma_arch")
            .setDescription("Arma Archboss")
            .setRequired(true)
            .setAutocomplete(true)
    );

const listarArchCmd = new SlashCommandBuilder()
    .setName("listar_arch")
    .setDescription("Mostra seus registros da lista Archboss");

const removerArchCmd = new SlashCommandBuilder()
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
    .setName("item_raro")
    .setDescription("Registrar item raro na lista de desejo")
    .addStringOption((o) =>
        o.setName("nick").setDescription("Nick").setRequired(true)
    )
    .addStringOption((o) =>
        o
            .setName("item_raro")
            .setDescription("Item raro")
            .setRequired(true)
            .setAutocomplete(true)
    );

const removerItemRaroCmd = new SlashCommandBuilder()
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
    .setName("fila_item_raro")
    .setDescription("Mostra a fila de jogadores para um item raro específico")
    .addStringOption((o) =>
        o
            .setName("item_raro")
            .setDescription("Item raro")
            .setRequired(true)
            .setAutocomplete(true)
    );

const cooldownCmd = new SlashCommandBuilder()
    .setName("cooldown")
    .setDescription("Verifica quanto tempo falta para acabar o cooldown de Archboss")
    .addStringOption((o) =>
        o
            .setName("nick")
            .setDescription("Nick do personagem registrado no histórico")
            .setRequired(true)
    );

const cooldownItemRaroCmd = new SlashCommandBuilder()
    .setName("cooldown_item_raro")
    .setDescription("Verifica quanto tempo falta para acabar o cooldown de item raro")
    .addStringOption((o) =>
        o
            .setName("nick")
            .setDescription("Nick do personagem registrado no histórico")
            .setRequired(true)
    );

const meusItensCmd = new SlashCommandBuilder()
    .setName("meus_itens_a_venda")
    .setDescription("Lista os itens à venda de um jogador")
    .addStringOption((o) =>
        o
            .setName("nick")
            .setDescription("Nick exato do jogador na planilha (ex: Evojoker)")
            .setRequired(true)
    );

const minhasVendasCmd = new SlashCommandBuilder()
    .setName("minhas_vendas")
    .setDescription("Mostra as vendas (pagas e pendentes) de um jogador")
    .addStringOption((o) =>
        o
            .setName("nick")
            .setDescription("Nick exato do jogador na planilha de vendas")
            .setRequired(true)
    );

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: [],
  });

  await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID),
      {
        body: [
          armaArchCmd.toJSON(),
          listarArchCmd.toJSON(),
          removerArchCmd.toJSON(),
          filaArchCmd.toJSON(),
          itemRaroCmd.toJSON(),
          removerItemRaroCmd.toJSON(),
          filaItemCmd.toJSON(),
          cooldownCmd.toJSON(),
          cooldownItemRaroCmd.toJSON(),
          meusItensCmd.toJSON(),
          minhasVendasCmd.toJSON(),
        ],
      }
  );

  console.log("✅ Comandos registrados na guild.");
})();
