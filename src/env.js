const DISCORD_ENV_VARS = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
];

const POSTGRES_ENV_VARS = [
  "DATABASE_URL",
];

function validateRequiredEnv() {
  const required = [
    ...DISCORD_ENV_VARS,
    ...POSTGRES_ENV_VARS,
  ];
  const missing = required.filter((name) => !String(process.env[name] || "").trim());

  if (!missing.length) return;

  console.error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

module.exports = {
  DISCORD_ENV_VARS,
  POSTGRES_ENV_VARS,
  validateRequiredEnv,
};
