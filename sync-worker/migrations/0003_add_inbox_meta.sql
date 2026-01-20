CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_user_updated ON inbox_items(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_inbox_user_deleted ON inbox_items(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS user_meta (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  meta_key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_meta_user_updated ON user_meta(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_meta_user_deleted ON user_meta(user_id, deleted_at);
