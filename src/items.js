const weapons = [
  "🗡️ Espadão do Cordy (Cordy Greatsword)",
  "🗡️ Espadão do Tevent (Tevent Greatsword)",
  "🛡️ Espada e Escudo da Deluznoa (Deluznoa Sword and Shield)",
  "🛡️ Espada e Escudo da Belandir (Belandir Sword and Shield)",
  "⚔️ Adaga da Deluznoa (Deluznoa Dagger)",
  "⚔️ Adaga do Tevent (Tevent Dagger)",
  "🎯 Balestra do Cordy (Cordy Crossbow)",
  "🎯 Balestra da Belandir (Belandir Crossbow)",
  "🏹 Arco do Tevent (Tevent Bow)",
  "🏹 Arco da Deluznoa (Deluznoa Bow)",
  "⚡ Cajado da Deluznoa (Deluznoa Staff)",
  "⚡ Cajado da Belandir (Belandir Staff)",
  "🪄 Varinha do Tevent (Tevent Wand)",
  "🪄 Varinha do Cordy (Cordy Wand)",
  "🗡️ Lança da Deluznoa (Deluznoa Spear)",
  "🗡️ Lança da Belandir (Belandir Spear)",
  "🔮 Orb do Tevent (Tevent Orb)",
  "🔮 Orb do Cordy (Cordy Orb)",
];

const rareItems = [
  "Brooch of Certainty (Broche da Certeza)",
  "Brooch of Nimblesness (Broche da Agilidade)",
  "Brooch of Devastation (Broche da Devastação)",
  "Brooch of Everlasting (Broche da Eternidade)",
  "Brooch of Power Overwhelming (Broche do Poder Avassalador)",
  "Brooch of Awareness (Broche da Consciencia)",
  "Brooch of Primacy (Broche da Primazia)",
  "Sundering Brooch (Broche da Separação)",
  "Ballistic Brooch (Broche da Balistica)",
  "Tempest Brooch (Broche da Tempestade)",
  "Necklace of Exceptional Greed (Colar da Avareza Exepctional)",
  "Grand Aelon's Longbow of Blight (Arco Longo do Flagelo de Grande Aelon)",
  "Kowazan's Daggers of the Blood Moon (Adagas da Lua Sangrenta de Kowazan)",
  "Aridus's Immolated Voidstaff (Cajado do Vazio Imolado de Aridus)",
  "Talus's Incandescent Staff (Cajado Incandescente de Talus)",
  "Nirma's Sword of Falling Ash (Espada da Cinza Cadente de Nirma)",
  "Adentus's Cinderhulk Greatsword (Espada de Duas Mãos Verdinza de Adentus)",
  "Morokai's Soulfire Greatblade (Grande Lâmina Embrasalma de Morokai)",
  "Daigon's Charred Emberstaff (Cajado Abrasador Carbonizado de Daigon)",
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Soaring Emblem Ring (Anel do Emblema Ascendente)",
  "Kowazan's Crossbows of the Eclipse (Balestras do Eclipse de Kowazan)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Undying Star Necklace (Colar da Estrela Imortal)",
  "Extinction-proof Periapt (Periapto à Prova de Extinção)",
  "Necklace of Morning Mist (Colar da Névoa da Manhã)",
  "Bracelet of the Evening Tide (Bracelete da Maré Noturna)",
  "Ring of Forbidden Lust (Anel da Luxúria Esquecida)",
  "Coil of Righteous Demand (Espiral da Exigência Virtuosa)",
  "Ring of Divine Retribution (Anel da Retribuição Divina)",
  "Ring of Repeated Death (Anel da Morte Repetida)",
  "Wildcrest Studs (Adornos da Crista Selvagem)",
  "Talus's Transcendent Core (Núcleo Transcendente de Talus)",
  "Ring of Falling Dusk (Anel do Anoitecer)",
  "Cornelius's Blade of Dancing Flame (Lâmina da Flama Dançante de Cornélius)",
  "Malakar's Flamespike Crossbows (Balestras Espinholumes de Malakar)",
  "Akman's Bloodletting Crossbows (Balestras Sangrentas de Akman)",
  "Deckman's Balefire Scepter (Cetro Abraseirado de Deckman)",
  "Belt of Clutching Fear (Cinto do Medo Angustiante)",
  "Belt of the Dying Spark (Cinto da Centelha Esmorecente)",
  "Ring of Fractal Growth (Anel da Evolução Fractal)",
  "Necklace of Dawn's Light (Colar da Luz da Alvorada)",
  "Bracelet of Radiant Chains (Bracelete das Correntes Radiantes)",
  "Blood Crescent Pendant (Pingente da Crescente Sangrenta)",
  "Sash of Rustling Leaves (Faixa das Folhas Farfalhantes)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
  "Signet of the Alpha (Sinete do alfa)",
  "Junobote's Extra Smoldering Ranseur (Ranseur Esbraseantissimo de Junobote)",
  "Junobote's Blade of the Red Colossus (Lamina do Colosso Vermelho de Junobote)",
];

const RARE_WEAPON_ITEMS = new Set([
  "Grand Aelon's Longbow of Blight (Arco Longo do Flagelo de Grande Aelon)",
  "Kowazan's Daggers of the Blood Moon (Adagas da Lua Sangrenta de Kowazan)",
  "Aridus's Immolated Voidstaff (Cajado do Vazio Imolado de Aridus)",
  "Talus's Incandescent Staff (Cajado Incandescente de Talus)",
  "Nirma's Sword of Falling Ash (Espada da Cinza Cadente de Nirma)",
  "Adentus's Cinderhulk Greatsword (Espada de Duas Mãos Verdinza de Adentus)",
  "Morokai's Soulfire Greatblade (Grande Lâmina Embrasalma de Morokai)",
  "Daigon's Charred Emberstaff (Cajado Abrasador Carbonizado de Daigon)",
  "Kowazan's Crossbows of the Eclipse (Balestras do Eclipse de Kowazan)",
  "Cornelius's Blade of Dancing Flame (Lâmina da Flama Dançante de Cornélius)",
  "Malakar's Flamespike Crossbows (Balestras Espinholumes de Malakar)",
  "Akman's Bloodletting Crossbows (Balestras Sangrentas de Akman)",
  "Deckman's Balefire Scepter (Cetro Abraseirado de Deckman)",
  "Talus's Transcendent Core (Núcleo Transcendente de Talus)",
  "Junobote's Extra Smoldering Ranseur (Ranseur Esbraseantissimo de Junobote)",
  "Junobote's Blade of the Red Colossus (Lamina do Colosso Vermelho de Junobote)",
]);

const RARE_ARMOR_ITEMS = new Set([
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
]);

const MAX_RARE_ACCESSORIES_PER_USER = 3;
const MAX_RARE_ARMORS_PER_USER = 1;

function isRareWeapon(itemName) {
  return RARE_WEAPON_ITEMS.has(itemName);
}

function isRareArmor(itemName) {
  return RARE_ARMOR_ITEMS.has(itemName);
}

module.exports = {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_ARMORS_PER_USER,
  isRareArmor,
  isRareWeapon,
  rareItems,
  weapons,
};
