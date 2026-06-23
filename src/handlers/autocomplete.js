const { rareItems, weapons } = require("../items");
const {
  isAllowedChannel,
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

module.exports = {
  handleAutocomplete,
};
