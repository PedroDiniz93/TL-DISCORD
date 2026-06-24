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
  "🥊 Deluzhnoa's Icy Grasp",
  "🥊 Queen Bellandir's Gauntlet",
];

const archbossCodexAliases = [
  {
    localName: "🗡️ Espadão do Tevent (Tevent Greatsword)",
    codexNames: ["Tevent's Warblade of Despair", "Tevent's Warblade of Incineration"],
  },
  {
    localName: "🗡️ Espadão do Cordy (Cordy Greatsword)",
    codexNames: ["Giant Cordy's Ascension Greatsword"],
  },
  {
    localName: "⚔️ Adaga da Deluznoa (Deluznoa Dagger)",
    codexNames: ["Deluzhnoa's Permafrost Razors"],
  },
  {
    localName: "⚔️ Adaga do Tevent (Tevent Dagger)",
    codexNames: ["Tevent's Fangs of Fury"],
  },
  {
    localName: "🎯 Balestra da Belandir (Belandir Crossbow)",
    codexNames: ["Queen Bellandir's Toxic Spine Throwers"],
  },
  {
    localName: "🎯 Balestra do Cordy (Cordy Crossbow)",
    codexNames: ["Cordy's Stormspore Spike Slingers"],
  },
  {
    localName: "🏹 Arco da Deluznoa (Deluznoa Bow)",
    codexNames: ["Deluzhnoa's Arc of Frozen Death"],
  },
  {
    localName: "🏹 Arco do Tevent (Tevent Bow)",
    codexNames: ["Tevent's Arc of Wailing Death"],
  },
  {
    localName: "⚡ Cajado da Belandir (Belandir Staff)",
    codexNames: ["Queen Bellandir's Hivemind Staff"],
  },
  {
    localName: "⚡ Cajado da Deluznoa (Deluznoa Staff)",
    codexNames: ["Deluzhnoa's Ancient Petrified Staff"],
  },
  {
    localName: "🪄 Varinha do Cordy (Cordy Wand)",
    codexNames: ["Cordy's Grasp of Manipulation"],
  },
  {
    localName: "🪄 Varinha do Tevent (Tevent Wand)",
    codexNames: ["Tevent's Grasp of Withering"],
  },
  {
    localName: "🗡️ Lança da Belandir (Belandir Spear)",
    codexNames: ["Queen Bellandir's Serrated Spike"],
  },
  {
    localName: "🗡️ Lança da Deluznoa (Deluznoa Spear)",
    codexNames: ["Deluzhnoa's Serrated Shard"],
  },
  {
    localName: "🔮 Orb do Cordy (Cordy Orb)",
    codexNames: ["Cordy's Source of Contagion"],
  },
  {
    localName: "🔮 Orb do Tevent (Tevent Orb)",
    codexNames: ["Tevent's Omniscient Eye"],
  },
];

const worldBossWeaponT4Items = [
  "🗡️ Ascended Pakilo Naru's Greatsword",
  "🛡️ Ascended Daigon's Sword",
  "🛡️ Coldblooded Commander Declaration Sword",
  "⚔️ Ascended Leviathan's Daggers",
  "⚔️ Coldblooded Commander Deception Daggers",
  "🎯 Arctic Roar Tracking Crossbows",
  "🎯 Ascended Akman's Crossbows",
  "🏹 Arctic Roar Sniping Bow",
  "🏹 Ascended Leviathan's Bow",
  "⚡ Arctic Roar Staff",
  "⚡ Ascended Daigon's Staff",
  "🪄 Ascended Deckman's Wand",
  "🪄 Coldblooded Wand",
  "🗡️ Ascended Pakilo Naru's Spear",
  "🗡️ Coldblooded Commander Charging Spear",
  "🔮 Arctic Roar Resonating Orb",
  "🔮 Ascended Primal Brothers' Core",
  "🥊 Ahzreil's Flying Strike Gauntlets",
  "🥊 Arctic Roar Charging Gauntlets",
  "🥊 Ascended Leviathan's Gauntlets",
  "🥊 Crimson Valley's Gauntlets of Brutality",
];

const worldBossEquipT4Items = [
  "🎩 Prayer of Salvation Hat",
  "🥋 Blizzard Overture Armor",
  "🥋 Frigid Melody Armor",
  "🧥 North Wind's Tyranny Cloak",
  "🧤 Prophecy of Nine Lives Gloves",
  "🧤 Punisher's Wings Gloves",
  "👢 Azure Sky Apostle Greaves",
  "👢 Hex of Ingenuity Greaves",
  "👢 Stigma Executor Greaves",
];

const worldBossJewelryT4Items = [
  "💎 Ancient Dragon's Claw Earrings",
  "💎 Fallen Goddess' Tears Earrings",
  "📿 Last Dragon's Grudge Necklace",
  "💍 Sacred Tree Resurrection Ring",
  "🔗 Silvermoon Knight Belt",
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
  ...worldBossWeaponT4Items,
  ...worldBossEquipT4Items,
  ...worldBossJewelryT4Items,
];

const RARE_ARMOR_ITEMS = new Set([
  "Errant Scion Brim (Pala do Rebento Errante)",
  "Breath of Boundless Sky (Sopro do Céu Sempiterno)",
  "Veiled Concord Gloves (Luvas da Concordância Velada)",
  "Umbral Astarch Pants (Calça do Astarca Umbral)",
  "Crimson Lotus Chestplate (Peitoral do Lotus Carmesim)",
]);

const RARE_ITEM_SET = new Set([
  ...rareItems,
  ...worldBossWeaponT4Items.map(stripLeadingItemEmoji),
  ...worldBossEquipT4Items.map(stripLeadingItemEmoji),
  ...worldBossJewelryT4Items.map(stripLeadingItemEmoji),
]);
const WORLD_BOSS_WEAPON_T4_ITEM_SET = new Set([
  ...worldBossWeaponT4Items,
  ...worldBossWeaponT4Items.map(stripLeadingItemEmoji),
]);
const WORLD_BOSS_EQUIP_T4_ITEM_SET = new Set([
  ...worldBossEquipT4Items,
  ...worldBossEquipT4Items.map(stripLeadingItemEmoji),
]);
const WORLD_BOSS_JEWELRY_T4_ITEM_SET = new Set([
  ...worldBossJewelryT4Items,
  ...worldBossJewelryT4Items.map(stripLeadingItemEmoji),
]);

const MAX_RARE_ACCESSORIES_PER_USER = 3;
const MAX_RARE_EQUIPS_PER_USER = 1;
const MAX_WORLD_BOSS_WEAPONS_T4_PER_USER = 1;

function isRareArmor(itemName) {
  return RARE_ARMOR_ITEMS.has(itemName);
}

function isKnownRareItem(itemName) {
  return RARE_ITEM_SET.has(itemName);
}

function isWorldBossWeaponT4(itemName) {
  return WORLD_BOSS_WEAPON_T4_ITEM_SET.has(itemName);
}

function isWorldBossEquipT4(itemName) {
  return WORLD_BOSS_EQUIP_T4_ITEM_SET.has(itemName);
}

function isWorldBossJewelryT4(itemName) {
  return WORLD_BOSS_JEWELRY_T4_ITEM_SET.has(itemName);
}

function stripLeadingItemEmoji(itemName) {
  return String(itemName || "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

module.exports = {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_EQUIPS_PER_USER,
  MAX_WORLD_BOSS_WEAPONS_T4_PER_USER,
  isWorldBossEquipT4,
  isWorldBossJewelryT4,
  isRareArmor,
  isKnownRareItem,
  isWorldBossWeaponT4,
  rareItems,
  stripLeadingItemEmoji,
  archbossCodexAliases,
  worldBossEquipT4Items,
  worldBossJewelryT4Items,
  worldBossWeaponT4Items,
  weapons,
};
