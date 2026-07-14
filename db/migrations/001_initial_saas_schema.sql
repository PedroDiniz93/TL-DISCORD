CREATE TABLE IF NOT EXISTS guilds (
  id BIGSERIAL PRIMARY KEY,
  discord_guild_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  owner_discord_user_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id BIGINT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  allowed_channel_id TEXT NOT NULL DEFAULT '',
  admin_role_id TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, discord_user_id)
);

CREATE TABLE IF NOT EXISTS wishlist_entries (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('arch', 'rare')),
  item_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  registered_at_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by_discord_user_id TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS wishlist_entries_active_queue_idx
  ON wishlist_entries (guild_id, type, lower(item_name), created_at, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS wishlist_entries_active_user_idx
  ON wishlist_entries (guild_id, discord_user_id, type)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS deliveries (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  wishlist_entry_id BIGINT REFERENCES wishlist_entries(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('arch', 'rare')),
  item_name TEXT NOT NULL,
  player_name TEXT NOT NULL,
  discord_user_id TEXT NOT NULL DEFAULT '',
  delivered_at_text TEXT NOT NULL,
  delivered_by_discord_user_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_guild_type_created_idx
  ON deliveries (guild_id, type, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT REFERENCES guilds(id) ON DELETE SET NULL,
  discord_user_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_guild_created_idx
  ON audit_logs (guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'trial',
  current_period_ends_at TIMESTAMPTZ,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider TEXT NOT NULL DEFAULT '',
  provider_subscription_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, provider, provider_subscription_id)
);
