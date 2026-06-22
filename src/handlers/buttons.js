const {
  buildFilaArchReply,
  buildListarArchReply,
  buildRemoverArchReply,
} = require("./arch");
const {
  buildFilaItemRaroReply,
  buildListarItemRaroReply,
  buildRemoverItemRaroReply,
} = require("./rare-items");
const { buildWarningItemReply } = require("../responses");
const { tr } = require("../utils");

async function handleWishlistButton(interaction) {
  const [scope, type, action] = String(interaction.customId || "").split(":");
  if (scope !== "wishlist") return false;

  const itemName = extractItemNameFromMessage(interaction);

  if ((action === "queue" || action === "remove") && !itemName) {
    await interaction.editReply(
      buildWarningItemReply({
        interaction,
        title: tr(interaction, "⚠️ Item não identificado", "⚠️ Item not identified"),
        description: tr(
          interaction,
          "Não consegui identificar o item desse registro.",
          "I couldn't identify the item from this registration."
        ),
      })
    );
    return true;
  }

  if (type === "arch") {
    await handleArchButtonAction(interaction, action, itemName);
    return true;
  }

  if (type === "rare") {
    await handleRareItemButtonAction(interaction, action, itemName);
    return true;
  }

  await interaction.editReply(
    buildWarningItemReply({
      interaction,
      title: tr(interaction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        interaction,
        "Esse botão não é mais suportado.",
        "This button is no longer supported."
      ),
    })
  );
  return true;
}

async function handleArchButtonAction(interaction, action, itemName) {
  if (action === "queue") {
    return interaction.editReply(await buildFilaArchReply(interaction, itemName));
  }
  if (action === "remove") {
    return interaction.editReply(await buildRemoverArchReply(interaction, itemName));
  }
  if (action === "mine") {
    return interaction.editReply(await buildListarArchReply(interaction));
  }
  return sendUnsupportedAction(interaction);
}

async function handleRareItemButtonAction(interaction, action, itemName) {
  if (action === "queue") {
    return interaction.editReply(await buildFilaItemRaroReply(interaction, itemName));
  }
  if (action === "remove") {
    return interaction.editReply(await buildRemoverItemRaroReply(interaction, itemName));
  }
  if (action === "mine") {
    return interaction.editReply(await buildListarItemRaroReply(interaction));
  }
  return sendUnsupportedAction(interaction);
}

function sendUnsupportedAction(interaction) {
  return interaction.editReply(
    buildWarningItemReply({
      interaction,
      title: tr(interaction, "⚠️ Ação inválida", "⚠️ Invalid action"),
      description: tr(
        interaction,
        "Esse botão não é mais suportado.",
        "This button is no longer supported."
      ),
    })
  );
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
