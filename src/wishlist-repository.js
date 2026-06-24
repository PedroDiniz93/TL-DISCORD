const {
  ARCH_GAIN_HISTORY_SHEET,
  ARCH_SHEET,
  RARE_ITEM_GAIN_HISTORY_SHEET,
  RARE_ITEM_SHEET,
} = require("./config");
const { getSheet, getSheetRows, invalidateSheetRows } = require("./sheets");
const { normalizeQueueItemName, parseBrazilianDateTime } = require("./utils");

const WISHLIST_CONFIG_BY_TYPE = {
  arch: {
    active: ARCH_SHEET,
    history: ARCH_GAIN_HISTORY_SHEET,
    itemColumn: "Arma",
  },
  rare: {
    active: RARE_ITEM_SHEET,
    history: RARE_ITEM_GAIN_HISTORY_SHEET,
    itemColumn: "Item",
  },
};

function getWishlistConfig(type) {
  const config = WISHLIST_CONFIG_BY_TYPE[type];
  if (!config) throw new Error(`Unsupported wishlist type: ${type}`);
  return config;
}

async function getArchRows() {
  return getSheetRows(ARCH_SHEET.title, ARCH_SHEET.headers);
}

async function getRareItemRows() {
  return getSheetRows(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
}

async function getRowsByType(type) {
  const config = getWishlistConfig(type);
  return getSheetRows(config.active.title, config.active.headers);
}

async function getUserArchRows(discordUserId) {
  return filterRowsByDiscordUserId(await getArchRows(), discordUserId);
}

async function getUserRareItemRows(discordUserId) {
  return filterRowsByDiscordUserId(await getRareItemRows(), discordUserId);
}

async function getUserWishlistRows(discordUserId) {
  const [archRows, rareItemRows] = await Promise.all([
    getUserArchRows(discordUserId),
    getUserRareItemRows(discordUserId),
  ]);

  return {
    archRows,
    rareItemRows,
  };
}

async function getQueueRows(type, item) {
  const config = getWishlistConfig(type);
  const rows = await getRowsByType(type);
  const targetItem = normalizeQueueItemName(item);

  return rows
    .filter((row) => normalizeQueueItemName(row[config.itemColumn]) === targetItem)
    .map((row) => ({
      row,
      parsedDate: parseBrazilianDateTime(row.Data) || new Date(0),
    }))
    .sort(compareQueueEntries);
}

async function addArchRegistration({ registeredAt, nick, weapon, discordUserId }) {
  const sheet = await getSheet(ARCH_SHEET.title, ARCH_SHEET.headers);
  await sheet.addRow({
    Data: registeredAt,
    Nick: nick,
    Arma: weapon,
    DiscordUserId: discordUserId,
  });
  invalidateSheetRows(ARCH_SHEET.title);
}

async function addRareItemRegistration({ registeredAt, nick, item, discordUserId }) {
  const sheet = await getSheet(RARE_ITEM_SHEET.title, RARE_ITEM_SHEET.headers);
  await sheet.addRow({
    Data: registeredAt,
    Nick: nick,
    Item: item,
    DiscordUserId: discordUserId,
  });
  invalidateSheetRows(RARE_ITEM_SHEET.title);
}

async function deleteArchRow(row) {
  await row.delete();
  invalidateSheetRows(ARCH_SHEET.title);
}

async function deleteRareItemRow(row) {
  await row.delete();
  invalidateSheetRows(RARE_ITEM_SHEET.title);
}

async function addDeliveryHistory({ type, deliveredAt, player, item, discordUserId }) {
  const config = getWishlistConfig(type);
  const sheet = await getSheet(config.history.title, config.history.headers);
  await sheet.addRow({
    "Data/Hora": deliveredAt,
    Player: player,
    Item: item,
    DiscordUserId: discordUserId,
  });
}

async function deleteActiveRowByType(type, row) {
  const config = getWishlistConfig(type);
  await row.delete();
  invalidateSheetRows(config.active.title);
}

function filterRowsByDiscordUserId(rows, discordUserId) {
  const userId = String(discordUserId || "").trim();
  return rows.filter((row) => String(row.DiscordUserId || "").trim() === userId);
}

function compareQueueEntries(a, b) {
  if (a.parsedDate.getTime() !== b.parsedDate.getTime()) {
    return a.parsedDate.getTime() - b.parsedDate.getTime();
  }
  return (a.row.rowNumber || 0) - (b.row.rowNumber || 0);
}

module.exports = {
  addArchRegistration,
  addDeliveryHistory,
  addRareItemRegistration,
  deleteActiveRowByType,
  deleteArchRow,
  deleteRareItemRow,
  getArchRows,
  getQueueRows,
  getRareItemRows,
  getRowsByType,
  getUserArchRows,
  getUserRareItemRows,
  getUserWishlistRows,
  getWishlistConfig,
};
