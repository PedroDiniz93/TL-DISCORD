CREATE TABLE IF NOT EXISTS item_categories (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('arch', 'rare')),
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  limit_per_user INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, key)
);

CREATE INDEX IF NOT EXISTS item_categories_guild_type_order_idx
  ON item_categories (guild_id, type, sort_order, name);

CREATE TABLE IF NOT EXISTS guild_items (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES item_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('arch', 'rare')),
  name TEXT NOT NULL,
  name_pt TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  image_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guild_id, type, name)
);

CREATE INDEX IF NOT EXISTS guild_items_guild_type_active_order_idx
  ON guild_items (guild_id, type, active, sort_order, name);

CREATE INDEX IF NOT EXISTS guild_items_category_idx
  ON guild_items (category_id);
