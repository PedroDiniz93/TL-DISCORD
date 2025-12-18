require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const GUILD_ID = process.env.GUILD_ID; // coloque no .env

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
"🔮 Orb do Cordy"
];

const cmd = new SlashCommandBuilder()
  .setName("arma_arch")
  .setDescription("Registra seu nick e sua arma na planilha")
  .addStringOption(o =>
    o.setName("nick")
      .setDescription("Nick do personagem (ex: Evojoker)")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("arma_arch")
      .setDescription("Arma escolhida")
      .setRequired(true)
      .addChoices(...weapons.map(w => ({ name: w, value: w })))
  );

(async () => {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  // Guild-only (instantâneo)
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, GUILD_ID),
    { body: [cmd.toJSON()] }
  );

  console.log("✅ Comando /arma (nick + arma) registrado para esta guild");
})();

