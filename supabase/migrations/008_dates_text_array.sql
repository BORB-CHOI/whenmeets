-- 요일 선택 모드 지원: dates 컬럼을 DATE[] -> TEXT[]로 변경
-- DATE[]는 'mon', 'tue' 같은 요일 키를 저장할 수 없어 요일 모드 이벤트 생성이 실패함.
-- TEXT[]로 변경하면 ISO 날짜('YYYY-MM-DD')와 요일 키('mon'..'sun') 둘 다 저장 가능.

-- 1. dates를 참조하는 뷰를 먼저 drop (컬럼 타입 변경 시 의존성 충돌 방지)
DROP VIEW IF EXISTS events_public;

-- 2. events 테이블 컬럼 타입 변경 (DATE[] -> TEXT[])
ALTER TABLE events
  ALTER COLUMN dates TYPE TEXT[]
  USING ARRAY(SELECT to_char(unnest(dates), 'YYYY-MM-DD'));

-- 3. 뷰 재생성
CREATE VIEW events_public AS
  SELECT id, title, dates, time_start, time_end, created_at,
         (password_hash IS NOT NULL) AS has_password,
         mode, date_only, created_by
  FROM events;

GRANT SELECT ON events_public TO anon;
