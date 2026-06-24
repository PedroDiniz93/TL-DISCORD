const fs = require("fs/promises");
const path = require("path");

const ROOT_CACHE_PATH = path.join(__dirname, "..", "tl-items-cache.json");
const DATA_CACHE_PATH = path.join(__dirname, "..", "data", "tl-items-cache.json");
const CACHE_PATH = ROOT_CACHE_PATH;

async function getCachedItemInfo(cacheKey) {
  const cache = await readCache();
  return cache[cacheKey] || null;
}

async function setCachedItemInfo(cacheKey, itemInfo) {
  const cache = await readCache();
  cache[cacheKey] = {
    ...itemInfo,
    cachedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  return cache[cacheKey];
}

async function readCache() {
  for (const cachePath of [ROOT_CACHE_PATH, DATA_CACHE_PATH]) {
    try {
      return JSON.parse(await fs.readFile(cachePath, "utf8"));
    } catch (err) {
      if (err?.code !== "ENOENT") throw err;
    }
  }

  return {};
}

module.exports = {
  CACHE_PATH,
  DATA_CACHE_PATH,
  ROOT_CACHE_PATH,
  getCachedItemInfo,
  setCachedItemInfo,
};
