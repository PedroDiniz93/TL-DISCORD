import fs from "fs";
import path from "path";

const ITEM_IMAGES: Record<string, string> = {
  "🛡️ Espada/Escudo Belandir (Belandir Sword/Shield)": "belandir-sword-and-shield.webp",
  "🛡️ Espada/Escudo Deluznoa (Deluznoa Sword/Shield)": "deluznoa-sword-and-shield.webp",
  "🗡️ Espadão do Cordy (Cordy Greatsword)": "cordy-greatsword.webp",
  "🗡️ Espadão do Tevent (Tevent Greatsword)": "tevent-greatsword.webp",
  "⚔️ Adaga da Deluznoa (Deluznoa Dagger)": "deluznoa-dagger.webp",
  "⚔️ Adaga do Tevent (Tevent Dagger)": "tevent-dagger.webp",
  "🎯 Balestra da Belandir (Belandir Crossbow)": "belandir-crossbow.webp",
  "🎯 Balestra do Cordy (Cordy Crossbow)": "cordy-crossbow.webp",
  "🏹 Arco da Deluznoa (Deluznoa Bow)": "deluznoa-bow.webp",
  "🏹 Arco do Tevent (Tevent Bow)": "tevent-bow.webp",
  "⚡ Cajado da Belandir (Belandir Staff)": "belandir-staff.webp",
  "⚡ Cajado da Deluznoa (Deluznoa Staff)": "deluznoa-staff.webp",
  "🪄 Varinha do Cordy (Cordy Wand)": "cordy-wand.webp",
  "🪄 Varinha do Tevent (Tevent Wand)": "tevent-wand.webp",
  "🗡️ Lança da Belandir (Belandir Spear)": "belandir-spear.webp",
  "🗡️ Lança da Deluznoa (Deluznoa Spear)": "deluznoa-spear.webp",
  "🔮 Orb do Cordy (Cordy Orb)": "cordy-orb.webp",
  "🔮 Orb do Tevent (Tevent Orb)": "tevent-orb.webp",
};

export function getCatalogItemImageUrl(itemName: string, imageUrl: string) {
  const existing = String(imageUrl || "").trim();
  if (existing.startsWith("assets/items/")) {
    return getItemAssetUrl(path.basename(existing));
  }
  if (existing) return existing;

  const fileName = findItemAssetFileName(itemName);
  return fileName ? getItemAssetUrl(fileName) : "";
}

export function getItemAssetPath(fileName: string) {
  const safeFileName = path.basename(fileName);
  if (!safeFileName || safeFileName !== fileName) return "";

  const candidates = [
    path.join(process.cwd(), "assets", "items", safeFileName),
    path.join(process.cwd(), "..", "assets", "items", safeFileName),
  ];
  return candidates.find((filePath) => fs.existsSync(filePath)) || "";
}

function getItemAssetUrl(fileName: string) {
  return `/api/item-assets/${encodeURIComponent(fileName)}`;
}

function findItemAssetFileName(itemName: string) {
  const candidates = [
    ITEM_IMAGES[itemName],
    `${slugifyItemName(itemName)}.webp`,
    `${getDisplayItemName(itemName)}.webp`,
  ].filter(Boolean);

  return candidates.find((candidate) => Boolean(getItemAssetPath(candidate))) || "";
}

function getDisplayItemName(itemName: string) {
  const value = String(itemName || "").trim();
  const parenMatch = value.match(/\(([^)]+)\)/);
  const beforeParen = value.replace(/\s*\([^)]+\)\s*$/, "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

  if (beforeParen && !/[^\x00-\x7F]/.test(beforeParen)) return beforeParen;
  return parenMatch ? parenMatch[1].trim() : beforeParen || value;
}

function slugifyItemName(itemName: string) {
  return getDisplayItemName(itemName)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
