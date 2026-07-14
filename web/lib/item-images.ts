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

export function getCatalogItemImageUrl(itemName: string, imageUrl: string, aliases: string[] = []) {
  const existing = String(imageUrl || "").trim();
  if (existing.startsWith("assets/items/")) {
    return getItemAssetUrl(path.basename(existing));
  }
  if (existing) return existing;

  const fileName = findItemAssetFileName(itemName, aliases);
  return fileName ? getItemAssetUrl(fileName) : "";
}

export function getItemAssetPath(fileName: string) {
  const safeFileName = path.basename(fileName);
  if (!safeFileName || safeFileName !== fileName) return "";

  const candidates = [
    path.join(process.cwd(), "public", "item-assets", safeFileName),
    path.join(process.cwd(), "assets", "items", safeFileName),
    path.join(process.cwd(), "..", "assets", "items", safeFileName),
  ];
  return candidates.find((filePath) => fs.existsSync(filePath)) || "";
}

function getItemAssetUrl(fileName: string) {
  return `/item-assets/${encodeURIComponent(fileName)}`;
}

function findItemAssetFileName(itemName: string, aliases: string[]) {
  const names = [itemName, ...aliases].map((value) => String(value || "").trim()).filter(Boolean);
  const directCandidates = names.flatMap((name) => [
    ITEM_IMAGES[name],
    `${slugifyItemName(name)}.webp`,
    `${getDisplayItemName(name)}.webp`,
  ]).filter(Boolean);

  const direct = directCandidates.find((candidate) => Boolean(getItemAssetPath(candidate)));
  if (direct) return direct;

  const assetIndex = getAssetIndex();
  for (const name of names) {
    const keys = [
      normalizeAssetKey(name),
      normalizeAssetKey(getDisplayItemName(name)),
      normalizeAssetKey(slugifyItemName(name)),
    ].filter(Boolean);
    const match = keys.map((key) => assetIndex.get(key)).find(Boolean);
    if (match) return match;
  }

  return "";
}

function getAssetIndex() {
  const index = new Map<string, string>();
  for (const dir of getAssetDirs()) {
    if (!fs.existsSync(dir)) continue;
    for (const fileName of fs.readdirSync(dir)) {
      if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)) continue;
      const baseName = path.basename(fileName, path.extname(fileName));
      for (const key of [normalizeAssetKey(baseName), normalizeAssetKey(fileName)]) {
        if (key && !index.has(key)) index.set(key, fileName);
      }
    }
  }
  return index;
}

function getAssetDirs() {
  return [
    path.join(process.cwd(), "public", "item-assets"),
    path.join(process.cwd(), "assets", "items"),
    path.join(process.cwd(), "..", "assets", "items"),
  ];
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

function normalizeAssetKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
