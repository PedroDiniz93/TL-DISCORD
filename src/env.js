const DISCORD_ENV_VARS = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
];

const SHEETS_ENV_VARS = [
  "GUILD_ID",
  "SHEET_ID",
  "GOOGLE_CREDS_B64",
  "ALLOWED_CHANNEL_ID",
  "ADMIN_ROLE_ID",
];

const POSTGRES_ENV_VARS = [
  "DATABASE_URL",
];

function validateRequiredEnv() {
  const required = [
    ...DISCORD_ENV_VARS,
    ...getStorageEnvVars(),
  ];
  const missing = required.filter((name) => !String(process.env[name] || "").trim());

  if (!missing.length) return;

  console.error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

function getStorageDriver() {
  return String(process.env.STORAGE_DRIVER || "sheets").trim().toLowerCase();
}

function getStorageEnvVars() {
  const storageDriver = getStorageDriver();
  if (storageDriver === "postgres" || storageDriver === "postgresql") {
    return POSTGRES_ENV_VARS;
  }
  return SHEETS_ENV_VARS;
}

module.exports = {
  DISCORD_ENV_VARS,
  POSTGRES_ENV_VARS,
  SHEETS_ENV_VARS,
  getStorageDriver,
  validateRequiredEnv,
};
