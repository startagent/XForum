-- 添加剧本相关表（仅表结构，不含数据）
-- 用户通过 /scenario-editor 页面创作剧本

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  cover_emoji TEXT DEFAULT '🌙',
  content_level TEXT DEFAULT 'safe',
  tags TEXT DEFAULT '[]',
  recommended_planets TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  is_pinned INTEGER DEFAULT 0,
  open_hour_start INTEGER,
  open_hour_end INTEGER,
  variables TEXT,
  play_count INTEGER DEFAULT 0,
  ending_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS scenario_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL,
  parent_id INTEGER,
  node_key TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  mood TEXT DEFAULT 'neutral',
  is_ending INTEGER DEFAULT 0,
  ending_type TEXT,
  ending_title TEXT,
  state_effects TEXT,
  letter TEXT,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (parent_id) REFERENCES scenario_nodes(id)
);

CREATE TABLE IF NOT EXISTS scenario_choices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  target_node_id INTEGER,
  required_state TEXT,
  set_variables TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (node_id) REFERENCES scenario_nodes(id),
  FOREIGN KEY (target_node_id) REFERENCES scenario_nodes(id)
);

CREATE TABLE IF NOT EXISTS scenario_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  personality TEXT,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
);

CREATE TABLE IF NOT EXISTS scenario_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scenario_id INTEGER NOT NULL,
  current_node_id INTEGER,
  variables TEXT DEFAULT '{}',
  visited_nodes TEXT DEFAULT '[]',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  UNIQUE(user_id, scenario_id)
);

CREATE TABLE IF NOT EXISTS scenario_endings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scenario_id INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  ending_type TEXT,
  ending_title TEXT,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
  FOREIGN KEY (node_id) REFERENCES scenario_nodes(id)
);
