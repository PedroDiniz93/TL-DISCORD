const fs = require("fs");
const path = require("path");

const ITEM_IMAGES = {
  "🛡️ Espada/Escudo Belandir (Belandir Sword/Shield)":
    "assets/items/belandir-sword-and-shield.webp",
  "🛡️ Espada/Escudo Deluznoa (Deluznoa Sword/Shield)":
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

function getDisplayItemName(itemName) {
  const value = String(itemName || "").trim();
  const parenMatch = value.match(/\(([^)]+)\)/);
  const beforeParen = value.replace(/\s*\([^)]+\)\s*$/, "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

  if (beforeParen && !/[^\x00-\x7F]/.test(beforeParen)) return beforeParen;
  return parenMatch ? parenMatch[1].trim() : beforeParen || value;
}

function slugifyItemName(itemName) {
  return getDisplayItemName(itemName)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSafeAttachmentName(itemName, relativePath) {
  const extension = path.extname(relativePath) || ".webp";
  const slug =
    slugifyItemName(itemName) ||
    path
      .basename(relativePath, extension)
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "item-image";

  return `${slug}${extension.toLowerCase()}`;
}

function getItemImage(itemName) {
  const relativePaths = [
    ITEM_IMAGES[itemName],
    `assets/items/${slugifyItemName(itemName)}.webp`,
    `assets/items/${getDisplayItemName(itemName)}.webp`,
  ].filter(Boolean);

  const relativePath = relativePaths.find((candidate) =>
    fs.existsSync(path.join(__dirname, "..", candidate))
  );
  if (!relativePath) return null;

  const absolutePath = path.join(__dirname, "..", relativePath);
  return {
    attachmentName: getSafeAttachmentName(itemName, relativePath),
    path: absolutePath,
  };
}

module.exports = {
  getSafeAttachmentName,
  getItemImage,
  slugifyItemName,
};
