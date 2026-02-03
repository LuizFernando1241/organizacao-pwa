CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  goals TEXT,
  blocks TEXT,
  phases TEXT,
  decisions TEXT,
  linked_task_ids TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_plans_user_updated ON plans(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_plans_user_deleted ON plans(user_id, deleted_at);
