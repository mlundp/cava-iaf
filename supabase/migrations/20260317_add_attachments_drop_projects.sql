ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
DROP TABLE IF EXISTS projects;
