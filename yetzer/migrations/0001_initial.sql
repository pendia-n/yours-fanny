PRAGMA foreign_keys = ON;
CREATE TABLE accounts (
 id TEXT PRIMARY KEY, username TEXT COLLATE NOCASE NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, passcode_hash TEXT, session_version INTEGER NOT NULL DEFAULT 0,
 password_changed_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE recovery_tickets (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, session_version INTEGER NOT NULL);
CREATE TABLE quest_templates (id TEXT PRIMARY KEY, title TEXT NOT NULL UNIQUE, invitation TEXT NOT NULL, preparation TEXT NOT NULL, transformation TEXT NOT NULL, preserve TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('edit','perform','imagine','adventure')), duration INTEGER NOT NULL);
CREATE TRIGGER quest_templates_immutable_update BEFORE UPDATE ON quest_templates BEGIN SELECT RAISE(ABORT, 'base_quests_are_immutable'); END;
CREATE TRIGGER quest_templates_immutable_delete BEFORE DELETE ON quest_templates BEGIN SELECT RAISE(ABORT, 'base_quests_are_immutable'); END;
CREATE TABLE daily_quests (id TEXT PRIMARY KEY, day TEXT NOT NULL, template_id TEXT NOT NULL REFERENCES quest_templates(id), position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 4), snapshot TEXT NOT NULL, UNIQUE(day,position), UNIQUE(day,template_id));
CREATE TABLE purchases (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), quest_id TEXT NOT NULL REFERENCES daily_quests(id),
 purchase_day TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reserved','pending','paid','submitted','expired','refunding','refunded','service_failed')),
 price_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'usd', checkout_id TEXT UNIQUE, checkout_url TEXT, payment_intent TEXT UNIQUE,
 created_at INTEGER NOT NULL, paid_at INTEGER, expires_at INTEGER NOT NULL, refund_id TEXT, failure_code TEXT
);
CREATE INDEX purchases_user_day ON purchases(account_id,purchase_day,status);
CREATE TRIGGER limit_daily_purchases BEFORE INSERT ON purchases
WHEN (SELECT COUNT(*) FROM purchases WHERE account_id=NEW.account_id AND purchase_day=NEW.purchase_day AND status <> 'expired') >= 3
BEGIN SELECT RAISE(ABORT, 'daily_purchase_limit'); END;
CREATE TABLE uploads (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL, r2_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, size INTEGER NOT NULL, duration REAL, width INTEGER, height INTEGER, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE generations (
 id TEXT PRIMARY KEY, purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id), account_id TEXT NOT NULL REFERENCES accounts(id), quest_id TEXT NOT NULL REFERENCES daily_quests(id),
 submission_day TEXT NOT NULL, status TEXT NOT NULL, model TEXT NOT NULL, resolution TEXT NOT NULL, duration INTEGER NOT NULL,
 raw_text TEXT NOT NULL, prompt TEXT NOT NULL, upload_ids TEXT NOT NULL, reference_token_hash TEXT NOT NULL, reference_expires_at INTEGER NOT NULL,
 provider_id TEXT UNIQUE, provider_generation_id TEXT, provider_cost REAL, provider_submitted_at INTEGER, r2_key TEXT,
 created_at INTEGER NOT NULL, completed_at INTEGER, expires_at INTEGER, views INTEGER NOT NULL DEFAULT 0, error_code TEXT
);
CREATE INDEX generations_manifestation ON generations(quest_id,status,expires_at,views DESC,completed_at DESC);
CREATE INDEX generations_user_day ON generations(account_id,submission_day);
CREATE TRIGGER enforce_generation_entitlement BEFORE INSERT ON generations BEGIN
 SELECT RAISE(ABORT,'purchase_not_available') WHERE NOT EXISTS(SELECT 1 FROM purchases WHERE id=NEW.purchase_id AND account_id=NEW.account_id AND quest_id=NEW.quest_id AND status='paid');
 SELECT RAISE(ABORT,'daily_submission_limit') WHERE (SELECT COUNT(*) FROM generations WHERE account_id=NEW.account_id AND submission_day=NEW.submission_day) >= 3;
END;
CREATE TRIGGER consume_generation_entitlement AFTER INSERT ON generations BEGIN UPDATE purchases SET status='submitted' WHERE id=NEW.purchase_id; END;
CREATE TABLE webhook_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, processed_at INTEGER NOT NULL);
