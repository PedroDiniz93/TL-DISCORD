const {
  MAX_RARE_ACCESSORIES_PER_USER,
  MAX_RARE_EQUIPS_PER_USER,
  MAX_WORLD_BOSS_WEAPONS_T4_PER_USER,
  isKnownRareItem,
  isRareArmor,
  isWorldBossEquipT4,
  isWorldBossJewelryT4,
  isWorldBossWeaponT4,
  rareItems,
  stripLeadingItemEmoji,
  weapons,
} = require("./items");
const { slugifyItemName } = require("./item-assets");
const { getCachedItemInfo, setCachedItemInfo } = require("./item-info-cache");
const { fetchTLCodexItemDetails } = require("./tlcodex-scraper");

const allKnownItems = [...weapons, ...rareItems];

async function getItemInfo(itemName) {
  const item = findKnownItem(itemName);
  if (!item) return null;

  const cacheKey = getItemCacheKey(item);
  const cached = await getCachedItemInfo(cacheKey);
  const baseInfo = cached || buildItemInfo(item);

  if (cached?.source === "tlcodex" && Array.isArray(cached.baseStats)) {
    const normalizedCached = normalizeScrapedItemInfo(cached);
    if (hasLevel12Stats(normalizedCached) || !isEnchantable(cached)) {
      return normalizedCached;
    }
  }

  try {
    const scraped = await fetchTLCodexItemDetails(baseInfo);
    if (scraped) {
      return setCachedItemInfo(cacheKey, {
        ...baseInfo,
        ...scraped,
      });
    }
  } catch (err) {
    // Keep the local record when the external source is unavailable.
  }

  if (cached) return cached;
  return setCachedItemInfo(cacheKey, baseInfo);
}

function normalizeScrapedItemInfo(info) {
  if (!info) return info;

  return {
    ...info,
    externalName: stripCodexSuffix(info.externalName),
    level12Stats: ensureLevel12Stats(info),
  };
}

function hasLevel12Stats(info) {
  return Array.isArray(info?.level12Stats) && info.level12Stats.length > 0;
}

function isEnchantable(info) {
  return Array.isArray(info?.flags) && info.flags.includes("Level up Available");
}

function findKnownItem(itemName) {
  const target = normalizeItemName(itemName);
  return allKnownItems.find((item) => normalizeItemName(item) === target) || "";
}

function findKnownItemByHash(itemHash, hashFn) {
  if (!itemHash || typeof hashFn !== "function") return "";

  return (
    allKnownItems.find((item) => hashFn(item) === itemHash) ||
    allKnownItems.find((item) => hashFn(stripLeadingItemEmoji(item)) === itemHash) ||
    ""
  );
}

function buildItemInfo(itemName) {
  const cleanName = stripLeadingItemEmoji(itemName);
  const names = splitItemNames(cleanName);
  const category = getItemCategory(itemName);

  return {
    source: "local-cache",
    originalName: itemName,
    displayName: cleanName,
    ptName: names.ptName,
    enName: names.enName,
    category: category.id,
    categoryLabel: category.label,
    typeLabel: category.typeLabel,
    limitLabel: category.limitLabel,
    externalUrl: buildExternalSearchUrl(names.enName || names.ptName || cleanName),
  };
}

function splitItemNames(itemName) {
  const value = String(itemName || "").trim();
  const match = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) {
    return {
      ptName: "",
      enName: value,
    };
  }

  const first = match[1].trim();
  const second = match[2].trim();
  const firstLooksEnglish = /^[\x00-\x7F]+$/.test(first);

  return firstLooksEnglish
    ? {
        ptName: second,
        enName: first,
      }
    : {
        ptName: first,
        enName: second,
      };
}

function getItemCategory(itemName) {
  const cleanName = stripLeadingItemEmoji(itemName);

  if (weapons.includes(itemName)) {
    return {
      id: "archboss_weapon",
      label: "Arma Archboss",
      typeLabel: "Archboss",
      limitLabel: "1 arma Archboss por jogador",
    };
  }

  if (isWorldBossWeaponT4(cleanName) || isWorldBossWeaponT4(itemName)) {
    return {
      id: "world_boss_weapon_t4",
      label: "Arma Boss Mundo T4",
      typeLabel: "World Boss T4",
      limitLabel: `${MAX_WORLD_BOSS_WEAPONS_T4_PER_USER} arma Boss Mundo T4 por jogador`,
    };
  }

  if (isWorldBossEquipT4(cleanName) || isWorldBossEquipT4(itemName)) {
    return {
      id: "world_boss_equip_t4",
      label: "Equipamento Boss Mundo T4",
      typeLabel: "World Boss T4",
      limitLabel: `${MAX_RARE_EQUIPS_PER_USER} equipamento T3/T4 por jogador`,
    };
  }

  if (isWorldBossJewelryT4(cleanName) || isWorldBossJewelryT4(itemName)) {
    return {
      id: "world_boss_jewelry_t4",
      label: "Joia Boss Mundo T4",
      typeLabel: "World Boss T4",
      limitLabel: `${MAX_RARE_ACCESSORIES_PER_USER} acessorios/joias por jogador`,
    };
  }

  if (isRareArmor(cleanName) || isRareArmor(itemName)) {
    return {
      id: "rare_equip",
      label: "Equipamento raro",
      typeLabel: "Item raro",
      limitLabel: `${MAX_RARE_EQUIPS_PER_USER} equipamento T3/T4 por jogador`,
    };
  }

  if (isKnownRareItem(cleanName) || isKnownRareItem(itemName)) {
    return {
      id: "rare_accessory",
      label: "Item raro",
      typeLabel: "Item raro",
      limitLabel: `${MAX_RARE_ACCESSORIES_PER_USER} acessorios/joias por jogador`,
    };
  }

  return {
    id: "unknown",
    label: "Item",
    typeLabel: "Desconhecido",
    limitLabel: "Sem limite configurado",
  };
}

function buildExternalSearchUrl(itemName) {
  const query = encodeURIComponent(`Throne and Liberty ${itemName}`);
  return `https://www.google.com/search?q=${query}`;
}

function stripCodexSuffix(value) {
  return String(value || "").replace(/\s*-\s*Items\s*-\s*Throne and Liberty Codex\s*$/i, "");
}

function ensureLevel12Stats(info) {
  const upgradeStats = info?.upgradeStats;
  const stats = upgradeStats?.stats?.["12"] || upgradeStats?.stats?.[12];
  const names = upgradeStats?.names || {};

  if (!stats || typeof stats !== "object") {
    return Array.isArray(info?.level12Stats) ? groupStatsByLabel(info.level12Stats) : [];
  }

  return buildFinalLevelStats(info?.baseStats, stats, names);
}

function buildFinalLevelStats(baseStats, levelStats, names) {
  if (!Array.isArray(baseStats) || !baseStats.length) return [];

  const incrementsByLabel = groupLevelIncrementsByLabel(levelStats, names);

  return baseStats
    .filter((stat) => normalizePlainText(stat.label) !== "damage")
    .map((stat) => ({
      label: String(stat?.label || "").trim(),
      value: formatFinalStatValue(stat?.value, incrementsByLabel.get(normalizePlainText(stat?.label))),
    }))
    .filter((stat) => stat.label && stat.value);
}

function groupLevelIncrementsByLabel(levelStats, names) {
  const incrementsByLabel = new Map();

  for (const [statId, value] of Object.entries(levelStats || {})) {
    const label = normalizePlainText(names[statId] || `Stat ${statId}`);
    const numericValue = Number(value);
    if (!label || !Number.isFinite(numericValue)) continue;

    if (!incrementsByLabel.has(label)) {
      incrementsByLabel.set(label, []);
    }
    incrementsByLabel.get(label).push(numericValue);
  }

  return incrementsByLabel;
}

function formatFinalStatValue(baseValue, increments = []) {
  const parsed = parseStatValue(baseValue);
  if (!parsed) return String(baseValue || "").trim();

  const increment = increments.length && shouldApplyIncrement(parsed) ? increments.shift() : 0;
  const finalValue = parsed.number + increment;
  return `${formatNumber(finalValue, parsed.hasPlusPrefix)}${parsed.suffix}`;
}

function shouldApplyIncrement(parsed) {
  if (parsed.suffix === "m" || parsed.suffix === "s") return false;
  return true;
}

function parseStatValue(value) {
  const text = String(value || "").trim();
  const match = text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  return {
    number: Number(match[1]),
    hasPlusPrefix: match[1].startsWith("+"),
    suffix: match[2] || "",
  };
}

function formatNumber(value, forcePlusPrefix = false) {
  const formatted = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  return forcePlusPrefix && value > 0 ? `+${formatted}` : formatted;
}

function groupStatsByLabel(stats) {
  const grouped = new Map();

  for (const stat of stats || []) {
    const label = String(stat?.label || "").trim();
    const value = String(stat?.value || "").trim();
    if (!label || !value) continue;

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label).push(value);
  }

  return [...grouped.entries()].map(([label, values]) => ({
    label,
    value: values.length === 1 ? values[0] : values.join(" ~ "),
  }));
}

function normalizePlainText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getItemCacheKey(itemName) {
  return slugifyItemName(itemName) || normalizeItemName(itemName);
}

function normalizeItemName(itemName) {
  return stripLeadingItemEmoji(itemName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

module.exports = {
  allKnownItems,
  findKnownItemByHash,
  getItemInfo,
};
