-- Phase 1a: Add columns for Google OAuth + dual auth support
-- Run this BEFORE deploying the new code

-- 1. Add new columns to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS date_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- mode: 'available' (default, mark available times) or 'unavailable' (mark unavailable times)
-- date_only: if true, uses "all_day" slot key instead of time slots
-- created_by: links to Supabase Auth user (nullable for anonymous creators)

-- 2. Add user_id to participants for logged-in users
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Index for user lookups (dashboard: "my events", "my responses")
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id) WHERE user_id IS NOT NULL;

-- 4. Update events_public view to include new columns
CREATE OR REPLACE VIEW events_public AS
  SELECT id, title, dates, time_start, time_end, created_at,
         (password_hash IS NOT NULL) AS has_password,
         mode, date_only, created_by
  FROM events;

-- 5. Update participants_public view to include user_id
CREATE OR REPLACE VIEW participants_public AS
  SELECT id, event_id, name, availability, created_at, user_id
  FROM participants;

-- 6. RLS policy for authenticated users to read their own data
CREATE POLICY "users_read_own_events" ON events
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "users_read_own_participants" ON participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
