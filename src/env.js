const REQUIRED_ENV_VARS = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "GUILD_ID",
  "SHEET_ID",
  "GOOGLE_CREDS_B64",
  "ALLOWED_CHANNEL_ID",
  "ADMIN_ROLE_ID",
];

function validateRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !String(process.env[name] || "").trim());

  if (!missing.length) return;

  console.error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

module.exports = {
  REQUIRED_ENV_VARS,
  validateRequiredEnv,
};
