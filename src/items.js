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
  "Necklace of Exceptional Greed (Colar da Avareza Exepctional)",
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Soaring Emblem Ring (Anel do Emblema Ascendente)",
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
  "Belt of Clutching Fear (Cinto do Medo Angustiante)",
  "Belt of the Dying Spark (Cinto da Centelha Esmorecente)",
  "Ring of Fractal Growth (Anel da Evolução Fractal)",
  "Necklace of Dawn's Light (Colar da Luz da Alvorada)",
  "Blood Crescent Pendant (Pingente da Crescente Sangrenta)",
  "Sash of Rustling Leaves (Faixa das Folhas Farfalhantes)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
  "Signet of the Alpha (Sinete do alfa)",
];

const RARE_ARMOR_ITEMS = new Set([
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
]);

const RARE_ITEM_SET = new Set(rareItems);

const MAX_RARE_ACCESSORIES_PER_USER = 3;
const MAX_RARE_ARMORS_PER_USER = 1;

function isRareArmor(itemName) {
  return RARE_ARMOR_ITEMS.has(itemName);
}

function isKnownRareItem(itemName) {
  return RARE_ITEM_SET.has(itemName);
}

module.exports = {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_ARMORS_PER_USER,
  isRareArmor,
  isKnownRareItem,
  rareItems,
  weapons,
};
