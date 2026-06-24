const TL_CODEX_BASE_URL = "https://tlcodex.com";
const TL_CODEX_TIMEOUT_MS = 12000;
const TL_CODEX_CACHE_TTL_MS = 10 * 60 * 1000;

const { archbossCodexAliases } = require("./items");

const listingCache = new Map();

async function fetchTLCodexItemDetails(item) {
  const lookupPlan = buildLookupPlan(item);

  for (const candidate of lookupPlan) {
    const listing = await fetchListing(candidate);
    const matched = matchBestListing(listing.rows, item, candidate);
    if (!matched) continue;

    const detail = await fetchItemDetail(matched.url);
    if (!detail) continue;

    return {
      source: "tlcodex",
      externalProvider: "tlcodex",
      externalId: matched.id,
      externalUrl: matched.url,
      externalName: detail.name || matched.name,
      externalDescription: detail.description || "",
      iconUrl: detail.iconUrl || matched.iconUrl || "",
      grade: matched.grade ?? null,
      combatPower: matched.combatPower ?? null,
      statusSummary: detail.statusSummary,
      baseStats: detail.baseStats,
      possibleTraits: detail.possibleTraits,
      flags: detail.flags,
      skillEffect: detail.skillEffect,
      upgradeStats: detail.upgradeStats,
      scrapedAt: new Date().toISOString(),
    };
  }

  return null;
}

function buildLookupPlan(item) {
  const searchText = [item?.enName, item?.ptName, item?.displayName, item?.originalName]
    .filter(Boolean)
    .join(" ");
  const searchTerm = searchText;

  if (item?.category === "archboss_weapon" || item?.category === "world_boss_weapon_t4") {
    return buildArchbossLookupPlan(item, searchTerm);
  }

  if (item?.category === "rare_equip" || item?.category === "world_boss_equip_t4") {
    return [{ type: "armor", searchTerm }];
  }

  if (item?.category === "rare_accessory" || item?.category === "world_boss_jewelry_t4") {
    return [{ type: "accessories", searchTerm }];
  }

  return [
    { type: "weapons", searchTerm },
    { type: "armor", searchTerm },
    { type: "accessories", searchTerm },
  ];
}

function buildArchbossLookupPlan(item, searchTerm) {
  const plans = [];
  const alias = archbossCodexAliases.find((entry) => entry.localName === item?.originalName);

  if (Array.isArray(alias?.codexNames)) {
    for (const codexName of alias.codexNames) {
      plans.push({
        type: "weapons",
        searchTerm: codexName,
        preferredName: codexName,
      });
    }
  }

  plans.push({ type: "weapons", searchTerm, preferredName: "" });
  return plans;
}

async function fetchListing(candidate) {
  const type = candidate?.type;
  const searchTerm = candidate?.searchTerm || "";
  const cacheKey = `${type}:${normalizeText(searchTerm)}`;
  const cached = listingCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const url = new URL("/query.php", TL_CODEX_BASE_URL);
  url.searchParams.set("a", "items");
  url.searchParams.set("type", type);
  url.searchParams.set("l", "en");
  url.searchParams.set("iDisplayStart", "0");
  url.searchParams.set("iDisplayLength", "250");
  url.searchParams.set("sEcho", "1");
  if (searchTerm) {
    url.searchParams.set("sSearch", searchTerm);
  }

  const json = await fetchJson(url.toString());
  const value = {
    rows: Array.isArray(json?.aaData) ? json.aaData : [],
  };

  if (!value.rows.length && searchTerm) {
    url.searchParams.delete("sSearch");
    const fallbackJson = await fetchJson(url.toString());
    value.rows = Array.isArray(fallbackJson?.aaData) ? fallbackJson.aaData : [];
  }

  listingCache.set(cacheKey, {
    value,
    expiresAt: now + TL_CODEX_CACHE_TTL_MS,
  });

  return value;
}

function matchBestListing(rows, item, candidatePlan = {}) {
  const candidates = rows
    .map((row) => parseListingRow(row))
    .filter((row) => row && row.name);

  if (!candidates.length) return null;

  const searchTokens = tokenize([
    item?.enName,
    item?.ptName,
    item?.displayName,
    item?.originalName,
  ].filter(Boolean).join(" "));

  let best = null;
  for (const candidate of candidates) {
    const score = scoreNameMatch(searchTokens, candidate.tokens, candidate.name);
    if (!best || score > best.score) {
      best = { ...candidate, score };
    }
  }

  const preferredName = normalizeText(candidatePlan?.preferredName);
  if (preferredName) {
    const exact = candidates.find((candidate) => normalizeText(candidate.name).includes(preferredName));
    if (exact) {
      return { ...exact, score: 100 };
    }
  }

  if (!best || best.score < 35) return null;
  return best;
}

function parseListingRow(row) {
  if (!Array.isArray(row) || row.length < 3) return null;

  const id = row[0];
  const iconHtml = String(row[1] || "");
  const titleHtml = String(row[2] || "");
  const name = stripHtml(titleHtml);
  const urlMatch = titleHtml.match(/href="([^"]+)"/i);
  const iconMatch = iconHtml.match(/src="([^"]+)"/i);

  return {
    id,
    name: normalizeDisplayName(name),
    tokens: tokenize(name),
    url: urlMatch ? absoluteUrl(urlMatch[1]) : `${TL_CODEX_BASE_URL}/en/item/${id}/`,
    iconUrl: iconMatch ? absoluteUrl(iconMatch[1]) : "",
    combatPower: row[3] ?? null,
    grade: row[6] ?? null,
    raw: row,
  };
}

async function fetchItemDetail(url) {
  const html = await fetchText(url);
  if (!html) return null;

  const name = extractMetaContent(html, "og:title") || extractTitleFromHtml(html);
  const description = decodeHtml(extractMetaContent(html, "og:description") || "");
  const statsTable = extractFirstItemStatsTable(html);
  const possibleTraits = extractPossibleTraits(html);
  const flags = extractItemFlags(html);
  const skillEffect = decodeHtml(extractTextBlock(html, 'id="stat-us"') || "");
  const upgradeStats = extractEnchantStats(html);
  const level12Stats = extractEnchantLevelStats(upgradeStats, 12);

  return {
    name: cleanCodexTitle(name),
    description,
    baseStats: statsTable.baseStats,
    statusSummary: formatStatusSummary(statsTable.baseStats),
    level12Stats,
    possibleTraits,
    flags,
    skillEffect,
    upgradeStats,
    iconUrl: extractMainImageUrl(html),
  };
}

function extractFirstItemStatsTable(html) {
  const tableMatch = html.match(/<table width="100%">([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return { baseStats: [] };
  }

  const rowsHtml = tableMatch[1];
  const rows = [...rowsHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  const baseStats = [];

  for (const rowHtml of rows) {
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]).trim());
    if (!cells.length) continue;

    if (cells.length === 1) {
      const damageMatch = rowHtml.match(/<td>([^<]+)<br>\s*<span[^>]*>([^<]+)<\/span><\/td>/i);
      if (damageMatch) {
        baseStats.push({
          label: normalizeDisplayName(damageMatch[1]),
          value: normalizeDisplayName(damageMatch[2]),
        });
      }
      continue;
    }

    const label = normalizeDisplayName(cells[0]);
    const value = normalizeDisplayName(cells[1]);
    if (!label || !value) continue;
    baseStats.push({ label, value });
  }

  return { baseStats };
}

function extractPossibleTraits(html) {
  const blockMatch = html.match(/<div class="gradient_header">Possible Traits<\/div>([\s\S]*?)<div class="mb-3"><div class="filter_header/i);
  if (!blockMatch) return [];

  const block = blockMatch[1];
  return [...block.matchAll(/<div class="d-flex justify-content-between"><div>([\s\S]*?)<\/div><div class="light_green_text">([\s\S]*?)<\/div><\/div>/gi)]
    .map((match) => ({
      label: normalizeDisplayName(stripHtml(match[1])),
      value: normalizeDisplayName(stripHtml(match[2])),
    }))
    .filter((trait) => trait.label && trait.value);
}

function extractItemFlags(html) {
  return [...html.matchAll(/<img[^>]*class="filter_icon[^"]*"[^>]*title="([^"]+)"/gi)]
    .map((match) => normalizeDisplayName(decodeHtml(match[1])))
    .filter(Boolean);
}

function extractEnchantStats(html) {
  const match = html.match(/var enchant_stats=([\s\S]*?);\s*var us_stats=/i);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch (err) {
    return null;
  }
}

function extractEnchantLevelStats(upgradeStats, level) {
  if (!upgradeStats || !upgradeStats.stats || !upgradeStats.names) return [];

  const levelStats = upgradeStats.stats[String(level)] || upgradeStats.stats[level];
  if (!levelStats || typeof levelStats !== "object") return [];

  const grouped = new Map();

  for (const [statId, value] of Object.entries(levelStats)) {
    const label = normalizeDisplayName(upgradeStats.names[statId] || `Stat ${statId}`);
    const normalizedValue = normalizeDisplayName(String(value));
    if (!label || !normalizedValue) continue;

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label).push(normalizedValue);
  }

  return [...grouped.entries()].map(([label, values]) => ({
    label,
    value: values.length === 1 ? values[0] : values.join(" ~ "),
  }));
}

function extractMainImageUrl(html) {
  const match = html.match(/<img[^>]*class="item_image[^"]*"[^>]*src="([^"]+)"/i);
  return match ? absoluteUrl(match[1]) : "";
}

function extractMetaContent(html, metaName) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)="${escapeRegExp(metaName)}"[^>]+content="([^"]*)"`, "i");
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]) : "";
}

function extractTitleFromHtml(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? cleanCodexTitle(stripHtml(match[1])) : "";
}

function cleanCodexTitle(value) {
  return normalizeDisplayName(String(value || "").replace(/\s*-\s*Items\s*-\s*Throne and Liberty Codex\s*$/i, ""));
}

function extractTextBlock(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return "";
  const start = html.indexOf(">", markerIndex);
  const end = html.indexOf("</div>", start);
  if (start === -1 || end === -1) return "";
  return stripHtml(html.slice(start + 1, end)).trim();
}

function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TL_CODEX_TIMEOUT_MS);

  return fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TLDiscordBot/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) return "";
      return response.text();
    })
    .catch(() => "")
    .finally(() => clearTimeout(timer));
}

async function fetchJson(url) {
  const text = await fetchText(url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

function scoreNameMatch(searchTokens, candidateTokens, candidateName) {
  const searchSet = new Set(searchTokens);
  const candidateSet = new Set(candidateTokens);

  if (!searchSet.size || !candidateSet.size) return 0;

  const exact = normalizeText(candidateName) === normalizeText(searchTokens.join(" "));
  if (exact) return 100;

  let overlap = 0;
  for (const token of searchSet) {
    if (candidateSet.has(token)) overlap += 1;
  }

  const union = new Set([...searchSet, ...candidateSet]).size;
  const jaccard = overlap / union;
  const coverage = overlap / Math.max(searchSet.size, 1);
  return Math.round((coverage * 70) + (jaccard * 30));
}

function formatStatusSummary(baseStats) {
  if (!Array.isArray(baseStats) || !baseStats.length) return "";
  return baseStats
    .slice(0, 8)
    .map((stat) => `${stat.label}: ${stat.value}`)
    .join("\n");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDisplayName(value) {
  return decodeHtml(String(value || "").replace(/\s+/g, " ").trim());
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 2 && !STOPWORDS.has(token));
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${TL_CODEX_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOPWORDS = new Set([
  "and",
  "the",
  "of",
  "to",
  "a",
  "an",
  "do",
  "da",
  "de",
  "dos",
  "das",
  "del",
  "la",
  "o",
  "e",
  "for",
  "with",
  "item",
]);

module.exports = {
  fetchTLCodexItemDetails,
  normalizeText,
  scoreNameMatch,
};
