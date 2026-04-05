-- Soft delete support: events are hidden from dashboard but preserved in DB
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for efficient dashboard queries excluding deleted events
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NULL;
