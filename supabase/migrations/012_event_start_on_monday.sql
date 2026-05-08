-- Per-event "start week on Monday" preference. Used by 요일(day-of-week) mode
-- and the month calendar (date-only) heatmap so the grid layout matches what
-- the creator chose in the event form.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS start_on_monday BOOLEAN NOT NULL DEFAULT false;
