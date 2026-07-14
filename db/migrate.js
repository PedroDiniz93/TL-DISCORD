require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const { closePool, query, transaction } = require("../src/db");

async function main() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await query(
      "SELECT filename FROM schema_migrations WHERE filename = $1",
      [file]
    );
    if (existing.rowCount) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    try {
      await transaction(async (client) => {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      });
      console.log(`Applied ${file}`);
    } catch (err) {
      throw err;
    }
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
