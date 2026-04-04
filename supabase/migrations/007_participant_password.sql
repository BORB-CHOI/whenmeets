-- 토큰 기반 → 이름+비밀번호 기반 인증 전환
TRUNCATE participants;
ALTER TABLE participants DROP COLUMN IF EXISTS token;
DROP INDEX IF EXISTS idx_participants_token;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS password_hash TEXT;
