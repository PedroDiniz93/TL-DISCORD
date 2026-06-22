const fs = require("fs");
const path = require("path");

const ITEM_IMAGES = {
  "🛡️ Espada e Escudo da Belandir (Belandir Sword and Shield)":
    "assets/items/belandir-sword-and-shield.webp",
  "🛡️ Espada e Escudo da Deluznoa (Deluznoa Sword and Shield)":
    "assets/items/deluznoa-sword-and-shield.webp",
  "🗡️ Espadão do Cordy (Cordy Greatsword)": "assets/items/cordy-greatsword.webp",
  "🗡️ Espadão do Tevent (Tevent Greatsword)": "assets/items/tevent-greatsword.webp",
  "⚔️ Adaga da Deluznoa (Deluznoa Dagger)": "assets/items/deluznoa-dagger.webp",
  "⚔️ Adaga do Tevent (Tevent Dagger)": "assets/items/tevent-dagger.webp",
  "🎯 Balestra da Belandir (Belandir Crossbow)": "assets/items/belandir-crossbow.webp",
  "🎯 Balestra do Cordy (Cordy Crossbow)": "assets/items/cordy-crossbow.webp",
  "🏹 Arco da Deluznoa (Deluznoa Bow)": "assets/items/deluznoa-bow.webp",
  "🏹 Arco do Tevent (Tevent Bow)": "assets/items/tevent-bow.webp",
  "⚡ Cajado da Belandir (Belandir Staff)": "assets/items/belandir-staff.webp",
  "⚡ Cajado da Deluznoa (Deluznoa Staff)": "assets/items/deluznoa-staff.webp",
  "🪄 Varinha do Cordy (Cordy Wand)": "assets/items/cordy-wand.webp",
  "🪄 Varinha do Tevent (Tevent Wand)": "assets/items/tevent-wand.webp",
  "🗡️ Lança da Belandir (Belandir Spear)": "assets/items/belandir-spear.webp",
  "🗡️ Lança da Deluznoa (Deluznoa Spear)": "assets/items/deluznoa-spear.webp",
  "🔮 Orb do Cordy (Cordy Orb)": "assets/items/cordy-orb.webp",
  "🔮 Orb do Tevent (Tevent Orb)": "assets/items/tevent-orb.webp",
};

function getItemImage(itemName) {
  const relativePath = ITEM_IMAGES[itemName];
  if (!relativePath) return null;

  const absolutePath = path.join(__dirname, "..", relativePath);
  if (!fs.existsSync(absolutePath)) return null;

  return {
    attachmentName: path.basename(relativePath),
    path: absolutePath,
  };
}

module.exports = {
  getItemImage,
};
