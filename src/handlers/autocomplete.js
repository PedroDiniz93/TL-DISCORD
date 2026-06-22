const { rareItems, weapons } = require("../items");
const { isAllowedChannel, respondAutocompleteOnce } = require("../utils");

async function handleAutocomplete(interaction) {
  try {
    if (interaction.responded) return;
    if (!isAllowedChannel(interaction)) {
      await respondAutocompleteOnce(interaction, []);
      return;
    }

    const focused = interaction.options.getFocused(true);
    const q = String(focused.value || "").toLowerCase();
    const dataByOptionName = {
      arch_weapon: weapons,
      arma_arch: weapons,
      item: weapons,
      rare_item: rareItems,
      item_raro: rareItems,
    };
    const list = dataByOptionName[focused.name] || [];
    const results = list
      .filter((x) => x.toLowerCase().includes(q))
      .slice(0, 25)
      .map((x) => ({
        name: x.length > 100 ? x.slice(0, 97) + "..." : x,
        value: x,
      }));

    await respondAutocompleteOnce(interaction, results);
  } catch (err) {
    console.error("❌ Autocomplete error:", err);
  }
}

module.exports = {
  handleAutocomplete,
};
