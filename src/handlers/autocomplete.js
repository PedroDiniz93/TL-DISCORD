const { rareItems, weapons } = require("../items");
const { allKnownItems } = require("../item-info-service");
const { getQueueRows } = require("../wishlist-repository");
const { getRulesForInteraction, isAllowedChannelForInteraction, isItemEnabled } = require("../guild-settings");
const {
  respondAutocompleteOnce,
  scoreSearchMatch,
} = require("../utils");

async function handleAutocomplete(interaction) {
  try {
    if (interaction.responded) return;
    if (!(await isAllowedChannelForInteraction(interaction))) {
      await respondAutocompleteOnce(interaction, []);
      return;
    }

    const focused = interaction.options.getFocused(true);
    if (interaction.commandName === "item_info") {
      await respondAutocompleteOnce(
        interaction,
        buildScoredAutocompleteResults(allKnownItems, String(focused.value || ""))
      );
      return;
    }

    if (interaction.commandName === "marcar_entregue") {
      await handleDeliveryAutocomplete(interaction, focused);
      return;
    }

    const q = String(focused.value || "");
    const rules = await getRulesForInteraction(interaction);
    const dataByOptionName = {
      arch_weapon: weapons,
      arma_arch: weapons,
      item: weapons,
      rare_item: rareItems,
      item_raro: rareItems,
    };
    const rawList = dataByOptionName[focused.name] || [];
    const itemType = ["rare_item", "item_raro"].includes(focused.name) ? "rare" : "arch";
    const list = rawList.filter((item) => isItemEnabled(rules, itemType, item));
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
  const rules = await getRulesForInteraction(interaction);

  if (focused.name === "item") {
    const list = type === "rare" ? rareItems : weapons;
    const itemType = type === "rare" ? "rare" : "arch";
    await respondAutocompleteOnce(
      interaction,
      buildScoredAutocompleteResults(
        list.filter((item) => isItemEnabled(rules, itemType, item)),
        q
      )
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
  const queueRows = await getQueueRows(type, item);
  const seen = new Set();

  return queueRows
    .map(({ row }) => String(row.Nick || "").trim())
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
