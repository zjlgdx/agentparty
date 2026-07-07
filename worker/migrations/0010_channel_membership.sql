-- Channel membership and human join links (#38).
CREATE TABLE channel_members (
  channel_slug TEXT NOT NULL,
  account TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (channel_slug, account)
);

CREATE TABLE channel_join_links (
  code TEXT PRIMARY KEY,
  channel_slug TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER
);

CREATE INDEX idx_channel_members_account ON channel_members(account, channel_slug);
CREATE INDEX idx_channel_join_links_channel ON channel_join_links(channel_slug, created_at);
