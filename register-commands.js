require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID;

const weapons = [
  "🗡️ Espadão do Cordy",
  "🗡️ Espadão do Tevent",
  "🛡️ Espada e Escudo da Deluznoa",
  "🛡️ Espada e Escudo da Belandir",
  "⚔️ Adaga da Deluznoa",
  "⚔️ Adaga do Tevent",
  "🎯 Balestra do Cordy",
  "🎯 Balestra da Belandir",
  "🏹 Arco do Tevent",
  "🏹 Arco da Deluznoa",
  "⚡ Cajado da Deluznoa",
  "⚡ Cajado da Belandir",
  "🪄 Varinha do Tevent",
  "🪄 Varinha do Cordy",
  "🗡️ Lança da Deluznoa",
  "🗡️ Lança da Belandir",
  "🔮 Orb do Tevent",
  "🔮 Orb do Cordy",
];

const armaArchCmd = new SlashCommandBuilder()
  .setName("arma_arch")
  .setDescription("Registrar arma Archboss na lista de desejo")
  .addStringOption((o) =>
    o
      .setName("nick")
      .setDescription("Nick")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("arma_arch")
      .setDescription("Arma Archboss")
      .setRequired(true)
      .addChoices(...weapons.map((w) => ({ name: w, value: w })))
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
      .addChoices(...weapons.map((w) => ({ name: w, value: w })))
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
  
  await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: [] }
    );


  // ⚠️ Isso SUBSTITUI os comandos da guild.
  // Como só estamos enviando /arma_arch, o /arma antigo será removido.
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID),
    {
      body: [
        armaArchCmd.toJSON(),
        listarArchCmd.toJSON(),
        removerArchCmd.toJSON(),
        cooldownCmd.toJSON(),
        meusItensCmd.toJSON(),
        minhasVendasCmd.toJSON(),
      ],
    }
  );

  console.log("✅ Comandos registrados na guild:");
  console.log("- /arma_arch (Nick + Arma Archboss)");
  console.log("- /listar_arch (Lista desejos do usuário)");
  console.log("- /remover_arch (Remove item da lista)");
  console.log("- /cooldown (Informa o tempo restante do player)");
  console.log("- /meus_itens_a_venda (Lista itens à venda do jogador)");
  console.log("- /minhas_vendas (Lista vendas pagas e pendentes do jogador)");
})();
