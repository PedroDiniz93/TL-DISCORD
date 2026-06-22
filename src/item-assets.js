const fs = require("fs");
const path = require("path");

const ITEM_IMAGES = {
  "🗡️ Espadão do Cordy (Cordy Greatsword)": "assets/items/cordy-greatsword.webp",
};

function getItemImage(itemName) {
  const relativePath = ITEM_IMAGES[itemName];
  if (!relativePath) return null;

  const absolutePath = path.join(__dirname, "..", relativePath);
  if (!fs.existsSync(absolutePath)) return null;

  return {
    attachmentName: path.basename(relativePath),
    path: absolutePath,
  };
}

module.exports = {
  getItemImage,
};
