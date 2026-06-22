const {
  buildFilaArchReply,
  buildRemoverArchReply,
} = require("./arch");
const {
  buildFilaItemRaroReply,
  buildRemoverItemRaroReply,
} = require("./rare-items");
const { buildMyItemsForInteraction } = require("./my-items");
const { buildWarningItemReply } = require("../responses");
const { tr } = require("../utils");

async function handleWishlistButton(interaction) {
  const [scope, type, action, lang] = String(interaction.customId || "").split(":");
  if (scope !== "wishlist") return false;

  const displayInteraction = withButtonLanguage(interaction, lang);
  const itemName = extractItemNameFromMessage(interaction);

  if ((action === "queue" || action === "remove") && !itemName) {
    await interaction.editReply(
      buildWarningItemReply({
        interaction: displayInteraction,
        title: tr(displayInteraction, "⚠️ Item não identificado", "⚠️ Item not identified"),
        description: tr(
          displayInteraction,
          "Não consegui identificar o item desse registro.",
          "I couldn't identify the item from this registration."
        ),
      })
    );
    return true;
  }

  if (type === "arch") {
    await handleArchButtonAction(interaction, displayInteraction, action, itemName);
    return true;
  }

  if (type === "rare") {
    await handleRareItemButtonAction(interaction, displayInteraction, action, itemName);
    return true;
  }

  await interaction.editReply(
    buildWarningItemReply({
      interaction: displayInteraction,
      title: tr(displayInteraction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        displayInteraction,
        "Esse botão não é mais suportado.",
        "This button is no longer supported."
      ),
    })
  );
  return true;
}

async function handleArchButtonAction(interaction, displayInteraction, action, itemName) {
  if (action === "queue") {
    return interaction.editReply(await buildFilaArchReply(displayInteraction, itemName));
  }
  if (action === "remove") {
    return interaction.editReply(await buildRemoverArchReply(displayInteraction, itemName));
  }
  if (action === "mine") {
    return interaction.editReply(await buildMyItemsForInteraction(displayInteraction));
  }
  return sendUnsupportedAction(interaction, displayInteraction);
}

async function handleRareItemButtonAction(
  interaction,
  displayInteraction,
  action,
  itemName
) {
  if (action === "queue") {
    return interaction.editReply(await buildFilaItemRaroReply(displayInteraction, itemName));
  }
  if (action === "remove") {
    return interaction.editReply(
      await buildRemoverItemRaroReply(displayInteraction, itemName)
    );
  }
  if (action === "mine") {
    return interaction.editReply(await buildMyItemsForInteraction(displayInteraction));
  }
  return sendUnsupportedAction(interaction, displayInteraction);
}

function sendUnsupportedAction(interaction, displayInteraction = interaction) {
  return interaction.editReply(
    buildWarningItemReply({
      interaction: displayInteraction,
      title: tr(displayInteraction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        displayInteraction,
        "Esse botão não é mais suportado.",
        "This button is no longer supported."
      ),
    })
  );
}

function withButtonLanguage(interaction, lang) {
  const commandNameByLang = {
    pt: "meus_itens",
    en: "my_items",
  };
  const commandName = commandNameByLang[lang];
  if (!commandName) return interaction;

  return new Proxy(interaction, {
    get(target, prop, receiver) {
      if (prop === "commandName") return commandName;
      return Reflect.get(target, prop, receiver);
    },
  });
}

function extractItemNameFromMessage(interaction) {
  const embed = interaction.message?.embeds?.[0];
  const fields = embed?.fields ?? [];
  const itemField = fields.find((field) =>
    /arma|weapon|item/i.test(String(field.name || ""))
  );

  if (itemField?.value) return String(itemField.value).trim();

  const description = embed?.description ?? "";
  const boldMatch = String(description).match(/\*\*(.+?)\*\*/);
  return boldMatch?.[1]?.trim() || "";
}

module.exports = {
  handleWishlistButton,
};
