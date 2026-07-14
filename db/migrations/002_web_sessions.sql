CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_sessions_user_expires_idx
  ON web_sessions (discord_user_id, expires_at DESC);
