-- Per-user folders for organizing the dashboard.
--
-- IMPORTANT: folder structure is per-user. A given event can appear in
-- different folders for different users — each user organizes their own
-- view independently. This is implemented with a separate
-- user_event_folders mapping table (NOT a folder_id column on events),
-- so moving an event in YOUR dashboard does not change anyone else's view.

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id_position
  ON folders(user_id, position);

-- One user shouldn't have two folders with the exact same name.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_folders_user_name
  ON folders(user_id, name);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Per-user folder assignment for events.
-- A row says "user_id has placed event_id into folder_id (which they own)".
-- Each user can have at most one folder per event (PRIMARY KEY).
-- Absence of a row = the event sits in "폴더 없음" for that user.
CREATE TABLE IF NOT EXISTS user_event_folders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_folders_user
  ON user_event_folders(user_id);

CREATE INDEX IF NOT EXISTS idx_user_event_folders_folder
  ON user_event_folders(folder_id);

ALTER TABLE user_event_folders ENABLE ROW LEVEL SECURITY;
