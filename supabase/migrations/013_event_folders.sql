-- Per-user folders for organizing created events in the dashboard.
-- Only the event creator (events.created_by) can place an event into a folder
-- (enforced at the API layer; RLS for service role is bypassed).

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Most queries are "list folders for this user, sorted by position"
CREATE INDEX IF NOT EXISTS idx_folders_user_id_position
  ON folders(user_id, position);

-- A user shouldn't have two folders with the exact same name
CREATE UNIQUE INDEX IF NOT EXISTS uniq_folders_user_name
  ON folders(user_id, name);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Folder assignment on events. Nullable: NULL means "No folder" (default).
-- ON DELETE SET NULL so deleting a folder doesn't cascade-delete events.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_folder_id ON events(folder_id);
