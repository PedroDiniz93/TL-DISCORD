const fs = require("fs/promises");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "..", "data", "tl-items-cache.json");

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
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, "utf8"));
  } catch (err) {
    if (err?.code === "ENOENT") return {};
    throw err;
  }
}

module.exports = {
  CACHE_PATH,
  getCachedItemInfo,
  setCachedItemInfo,
};
