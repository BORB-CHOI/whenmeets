-- 토큰 기반 → 이름+비밀번호 기반 인증 전환
-- WARNING: TRUNCATE destroys all participant data. Safe for pre-production only.
-- For production migration, use: ALTER TABLE ... DROP COLUMN token; ADD COLUMN password_hash;
TRUNCATE participants;
ALTER TABLE participants DROP COLUMN IF EXISTS token;
DROP INDEX IF EXISTS idx_participants_token;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_hash TEXT;
