-- Prevent duplicate participants for the same logged-in user on the same event.
-- Without this, a race condition between two POST /participants requests (e.g. a
-- user double-clicking 편집 or two tabs editing concurrently) can let both pass
-- the SELECT-then-INSERT check and create two rows with the same user_id. The
-- API then keeps falling back to "Foo (2)", "Foo (3)", … because ownExisting
-- (.maybeSingle) errors out when more than one row matches.
--
-- IMPORTANT: if duplicate rows already exist this CREATE will fail. Run the
-- diagnostic query first and resolve duplicates manually.
--
-- Diagnostic — list events where the same user_id has multiple participant rows:
--   SELECT event_id, user_id, count(*)
--   FROM participants
--   WHERE user_id IS NOT NULL
--   GROUP BY event_id, user_id
--   HAVING count(*) > 1;
--
-- Cleanup (dry-run first!) — keep the oldest row per (event_id, user_id):
--   DELETE FROM participants p
--   WHERE p.user_id IS NOT NULL
--     AND EXISTS (
--       SELECT 1 FROM participants q
--       WHERE q.event_id = p.event_id
--         AND q.user_id = p.user_id
--         AND q.created_at < p.created_at
--     );

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_event_user
  ON participants (event_id, user_id)
  WHERE user_id IS NOT NULL;
