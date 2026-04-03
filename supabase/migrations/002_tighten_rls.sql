-- Tighten RLS: remove open INSERT policies and hide sensitive columns

-- 1. Drop overly permissive INSERT policies
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "participants_insert" ON participants;

-- 2. Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "participants_select" ON participants;

-- 3. Create views that exclude sensitive columns for public access
CREATE OR REPLACE VIEW events_public AS
  SELECT id, title, dates, time_start, time_end, created_at,
         (password_hash IS NOT NULL) AS has_password
  FROM events;

CREATE OR REPLACE VIEW participants_public AS
  SELECT id, event_id, name, availability, created_at
  FROM participants;

-- 4. Grant anon access to views only (not base tables)
GRANT SELECT ON events_public TO anon;
GRANT SELECT ON participants_public TO anon;

-- 5. Revoke direct anon access to base tables
REVOKE ALL ON events FROM anon;
REVOKE ALL ON participants FROM anon;

-- Note: API routes use service role key which bypasses RLS entirely.
-- This migration ensures that anyone using the anon key (client-side)
-- can only read through the views, which exclude password_hash and token.
-- All writes are forced through the API routes (service role).
