-- Reusable project-agent profiles and per-channel invite records (#50 foundation).
CREATE TABLE agent_profiles (
  owner_account      TEXT NOT NULL,
  handle             TEXT NOT NULL,
  name               TEXT NOT NULL,
  runner             TEXT NOT NULL,
  repo_url           TEXT,
  workdir            TEXT,
  base_branch        TEXT NOT NULL DEFAULT 'main',
  worktree_strategy  TEXT NOT NULL DEFAULT 'branch',
  rules              TEXT,
  invitable_by       TEXT NOT NULL DEFAULT 'owner',
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  PRIMARY KEY (owner_account, handle)
);

CREATE TABLE channel_agent_invites (
  id              INTEGER PRIMARY KEY,
  channel_slug    TEXT NOT NULL,
  owner_account   TEXT NOT NULL,
  profile_handle  TEXT NOT NULL,
  invited_by      TEXT NOT NULL,
  invited_at      INTEGER NOT NULL,
  revoked_at      INTEGER,
  FOREIGN KEY (owner_account, profile_handle) REFERENCES agent_profiles(owner_account, handle)
);

CREATE INDEX idx_agent_profiles_owner ON agent_profiles(owner_account, updated_at);
CREATE INDEX idx_channel_agent_invites_profile ON channel_agent_invites(owner_account, profile_handle, invited_at);
CREATE INDEX idx_channel_agent_invites_channel ON channel_agent_invites(channel_slug, invited_at);
CREATE UNIQUE INDEX idx_channel_agent_invites_active
  ON channel_agent_invites(channel_slug, owner_account, profile_handle)
  WHERE revoked_at IS NULL;
