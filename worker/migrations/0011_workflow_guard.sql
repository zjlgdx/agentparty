-- Workflow-level no-progress guard (#35).
ALTER TABLE channels ADD COLUMN workflow_guard_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE channels ADD COLUMN workflow_guard_limit INTEGER NOT NULL DEFAULT 30;
