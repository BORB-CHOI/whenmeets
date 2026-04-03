-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- nanoid, not UUID
  title TEXT NOT NULL,
  dates DATE[] NOT NULL,
  time_start SMALLINT NOT NULL DEFAULT 18,  -- 09:00
  time_end SMALLINT NOT NULL DEFAULT 42,    -- 21:00
  password_hash TEXT,                       -- bcrypt hash, nullable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  availability JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast participant lookup by event
CREATE INDEX idx_participants_event_id ON participants(event_id);

-- Index for token-based auth
CREATE INDEX idx_participants_token ON participants(token);

-- RLS policies: all public access via anon key
-- Actual authorization happens in Next.js API routes using service role key
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow public read on events
CREATE POLICY "events_select" ON events FOR SELECT USING (true);

-- Allow public insert on events
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

-- Allow public read on participants
CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);

-- Allow public insert on participants
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (true);

-- Updates go through service role key (bypasses RLS), so no update policy needed for anon

-- Enable realtime for participants table
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
