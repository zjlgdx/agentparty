-- Lark / Feishu notification subscriptions and future inbound bridge state.
CREATE TABLE IF NOT EXISTS lark_notify_subscriptions (
  channel_slug TEXT NOT NULL,
  account TEXT NOT NULL,
  target_name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  receive_id TEXT NOT NULL,
  receive_id_type TEXT NOT NULL,
  secret TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (channel_slug, account)
);

CREATE INDEX IF NOT EXISTS idx_lark_notify_subscriptions_secret
  ON lark_notify_subscriptions(secret);

CREATE TABLE IF NOT EXISTS lark_chat_links (
  channel_slug TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  PRIMARY KEY (provider_id, chat_id)
);

CREATE TABLE IF NOT EXISTS lark_event_dedup (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);
