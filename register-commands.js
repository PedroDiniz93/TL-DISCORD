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

const rareItems = [
  "Grand Aelon's Longbow of Blight (Arco Longo do Flagelo de Grande Aelon)",
  "Kowazan's Daggers of the Blood Moon (Adagas da Lua Sangrenta de Kowazan)",
  "Junobote's Extra Smoldering Ranseur (Ranseur Esbraseantissimo de Junobote)",
  "Aridus's Immolated Voidstaff (Cajado do Vazio Imolado de Aridus)",
  "Talus's Incandescent Staff (Cajado Incandescente de Talus)",
  "Chernobog's Cauterizing Blade (Lâmina Cauterizadora de Chernobog)",
  "Cornelius's Blade of Dancing Flame (Lâmina da Flama Dançante de Cornélius)",
  "Ahzreil's Soulless Sword (Espada Desalmada de Ahzreil)",
  "Nirma's Sword of Falling Ash (Espada da Cinza Cadente de Nirma)" ,
  "Adentus's Cinderhulk Greatsword (Espada de Duas Mãos Verdinza de Adentus)",
  "Morokai's Soulfire Greatblade (Grande Lâmina Embrasalma de Morokai)",
  "Excavator's Radiant Scepter (Cetro Radiante do Escavador)",
  "Daigon's Charred Emberstaff (Cajado Abrasador Carbonizado de Daigon)",
  "Deckman's Balefire Scepter (Cetro Abraseirado de Deckman)",
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Veiled Concord Mask (Máscara da Concordância Velada)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Soaring Star Necklace (Colar da Estrela Imortal)",
  "Extinction-proof Periapt (Periapto à Prova de Extinção)",
  "Necklace of Morning Mist (Colar da Névoa da Manhã)",
  "Bracelet of the Evening Tide (Bracelete da Maré Noturna)",
  "Ring of Forbidden Lust (Anel da Luxúria Esquecida)",
  "Coil of Righteous Demand (Espiral da Exigência Virtuosa)",
  "Ring of Divine Retribution (Anel da Retribuição Divina)",
  "Ring of Repeated Death (Anel da Morte Repetida)",
  "Earring of Regracted Light (Brincos da Luz Refratada)",
  "Wildcrest Studs (Adornos da Crista Selvagem)",
  "Sash of Rustling Leaves (Faixa das Folhas Farfalhantes)",
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

const filaArchCmd = new SlashCommandBuilder()
  .setName("fila_arch")
  .setDescription("Mostra a fila de jogadores para uma arma Archboss específica")
  .addStringOption((o) =>
    o
      .setName("item")
      .setDescription("Arma Archboss")
      .setRequired(true)
      .addChoices(...weapons.map((w) => ({ name: w, value: w })))
  );

const itemRaroCmd = new SlashCommandBuilder()
  .setName("item_raro")
  .setDescription("Registrar item raro na lista de desejo")
  .addStringOption((o) =>
    o
      .setName("nick")
      .setDescription("Nick")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("item_raro")
      .setDescription("Item raro")
      .setRequired(true)
      .addChoices(...rareItems.map((w) => ({ name: w, value: w })))
  );

const removerItemRaroCmd = new SlashCommandBuilder()
  .setName("remover_item_raro")
  .setDescription("Remove um item raro da sua lista de desejo")
  .addStringOption((o) =>
    o
      .setName("item_raro")
      .setDescription("Item raro a ser removido")
      .setRequired(true)
      .addChoices(...rareItems.map((w) => ({ name: w, value: w })))
  );

const filaItemCmd = new SlashCommandBuilder()
  .setName("fila_item_raro")
  .setDescription("Mostra a fila de jogadores para um item raro específico")
  .addStringOption((o) =>
    o
      .setName("item_raro")
      .setDescription("Item raro")
      .setRequired(true)
      .addChoices(...rareItems.map((w) => ({ name: w, value: w })))
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

  console.log("✅ Comandos registrados na guild:");
  console.log("- /arma_arch (Nick + Arma Archboss)");
  console.log("- /listar_arch (Lista desejos do usuário)");
  console.log("- /remover_arch (Remove item da lista)");
  console.log("- /fila_arch (Mostra a fila de uma arma)");
  console.log("- /item_raro (Nick + Item raro)");
  console.log("- /remover_item_raro (Remove item raro da lista)");
  console.log("- /fila_item (Mostra a fila de um item raro)");
  console.log("- /cooldown (Informa o tempo restante do player)");
  console.log("- /cooldown_item_raro (Informa o tempo restante do player)");
  console.log("- /meus_itens_a_venda (Lista itens à venda do jogador)");
  console.log("- /minhas_vendas (Lista vendas pagas e pendentes do jogador)");
})();
