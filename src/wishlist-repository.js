const storageDriver = String(process.env.STORAGE_DRIVER || "sheets")
  .trim()
  .toLowerCase();

const repository =
  storageDriver === "postgres" || storageDriver === "postgresql"
    ? require("./wishlist-repository-postgres")
    : require("./wishlist-repository-sheets");

module.exports = repository;
