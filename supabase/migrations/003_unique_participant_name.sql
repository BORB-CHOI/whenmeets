-- Add unique constraint on (event_id, name) to prevent duplicate names
-- Uses lower() for case-insensitive uniqueness
CREATE UNIQUE INDEX idx_participants_event_name
  ON participants (event_id, lower(name));
