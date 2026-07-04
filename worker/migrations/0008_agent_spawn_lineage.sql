-- Agent spawn lineage (#18): short-lived child agent identities keep durable parent/root/team metadata.
ALTER TABLE tokens ADD COLUMN parent_agent TEXT;
ALTER TABLE tokens ADD COLUMN root_agent TEXT;
ALTER TABLE tokens ADD COLUMN team_id TEXT;
ALTER TABLE tokens ADD COLUMN spawn_depth INTEGER;
ALTER TABLE tokens ADD COLUMN child_expires_at INTEGER;
