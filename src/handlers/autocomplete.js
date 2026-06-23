const { rareItems, weapons } = require("../items");
const { ARCH_SHEET, RARE_ITEM_SHEET } = require("../config");
const { getSheet } = require("../sheets");
const {
  isAllowedChannel,
  normalizeQueueItemName,
  respondAutocompleteOnce,
  scoreSearchMatch,
} = require("../utils");

async function handleAutocomplete(interaction) {
  try {
    if (interaction.responded) return;
    if (!isAllowedChannel(interaction)) {
      await respondAutocompleteOnce(interaction, []);
      return;
    }

    const focused = interaction.options.getFocused(true);
    if (interaction.commandName === "marcar_entregue") {
      await handleDeliveryAutocomplete(interaction, focused);
      return;
    }

    const q = String(focused.value || "");
    const dataByOptionName = {
      arch_weapon: weapons,
      arma_arch: weapons,
      item: weapons,
      rare_item: rareItems,
      item_raro: rareItems,
    };
    const list = dataByOptionName[focused.name] || [];
    const results = list
      .map((x, index) => ({
        value: x,
        index,
        score: scoreSearchMatch(x, q),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 25)
      .map((result) => ({
        name:
          result.value.length > 100
            ? result.value.slice(0, 97) + "..."
            : result.value,
        value: result.value,
      }));

    await respondAutocompleteOnce(interaction, results);
  } catch (err) {
    console.error("❌ Autocomplete error:", err);
  }
}

async function handleDeliveryAutocomplete(interaction, focused) {
  const q = String(focused.value || "");
  const type = interaction.options.getString("tipo", false);

  if (focused.name === "item") {
    await respondAutocompleteOnce(
      interaction,
      buildScoredAutocompleteResults(type === "rare" ? rareItems : weapons, q)
    );
    return;
  }

  if (focused.name === "player") {
    const item = interaction.options.getString("item", false);
    if (!type || !item) {
      await respondAutocompleteOnce(interaction, []);
      return;
    }

    const players = await getPlayersInQueue(type, item);
    await respondAutocompleteOnce(
      interaction,
      buildScoredAutocompleteResults(players, q)
    );
    return;
  }

  await respondAutocompleteOnce(interaction, []);
}

async function getPlayersInQueue(type, item) {
  const config =
    type === "rare"
      ? {
          sheet: RARE_ITEM_SHEET,
          itemColumn: "Item",
        }
      : {
          sheet: ARCH_SHEET,
          itemColumn: "Arma",
        };
  const sheet = await getSheet(config.sheet.title, config.sheet.headers);
  const rows = await sheet.getRows();
  const targetItem = normalizeQueueItemName(item);
  const seen = new Set();

  return rows
    .filter((row) => normalizeQueueItemName(row[config.itemColumn]) === targetItem)
    .map((row) => String(row.Nick || "").trim())
    .filter(Boolean)
    .filter((player) => {
      const key = player.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildScoredAutocompleteResults(list, q) {
  return list
    .map((x, index) => ({
      value: x,
      index,
      score: scoreSearchMatch(x, q),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 25)
    .map((result) => ({
      name:
        result.value.length > 100
          ? result.value.slice(0, 97) + "..."
          : result.value,
      value: result.value,
    }));
}

module.exports = {
  handleAutocomplete,
};
