CREATE TABLE daily_releases (day TEXT PRIMARY KEY, owner TEXT NOT NULL, lease_until INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0);
CREATE TABLE daily_draws (day TEXT NOT NULL, template_id TEXT NOT NULL, probability REAL NOT NULL, attempted INTEGER NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'base', PRIMARY KEY(day,template_id));
