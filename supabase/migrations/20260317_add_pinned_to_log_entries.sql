ALTER TABLE log_entries ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
