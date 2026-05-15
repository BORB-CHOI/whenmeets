-- Ensure the per-user folder mapping table exists.
--
-- Migration 013 was redesigned mid-flight: the original version added an
-- events.folder_id column (global folder assignment), but it was replaced
-- with a per-user user_event_folders mapping table. If a database has
-- already applied the OLD 013, Supabase will not re-run the same filename,
-- so user_event_folders never gets created and PATCH /api/events/[id]/folder
-- fails with a 500. This migration fixes that by:
--   1) creating user_event_folders if missing,
--   2) migrating any pre-existing events.folder_id values into the mapping
--      table for the event creator,
--   3) dropping the now-unused events.folder_id column.
-- All steps are idempotent — re-running this migration is safe.

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

-- Backfill: if the old events.folder_id column still exists, copy its
-- values into the per-user mapping table (treating the event creator as
-- the owner of that assignment), then drop the column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'events'
      AND column_name = 'folder_id'
  ) THEN
    INSERT INTO user_event_folders (user_id, event_id, folder_id)
    SELECT e.created_by, e.id, e.folder_id
    FROM events e
    WHERE e.folder_id IS NOT NULL
      AND e.created_by IS NOT NULL
    ON CONFLICT (user_id, event_id) DO NOTHING;

    ALTER TABLE events DROP COLUMN folder_id;
  END IF;
END $$;
