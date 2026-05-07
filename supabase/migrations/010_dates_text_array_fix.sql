-- 008은 USING 절에 서브쿼리(SELECT to_char(unnest(...)))를 사용해 Postgres가
-- "cannot use subquery in transform expression" 으로 실패함.
-- 008은 `migration repair --status applied`로 마킹만 됐고 실제 ALTER는 적용되지 않아
-- events.dates는 여전히 DATE[]. 'mon','tue' 같은 요일 키 삽입이 모든 케이스에서 실패함.
--
-- 010에서 서브쿼리 없는 형태로 다시 적용한다.
-- DATE[] -> TEXT[] cast는 Postgres 기본 캐스트로 'YYYY-MM-DD' 문자열을 만든다.

-- 1. dates를 참조하는 뷰 drop (의존성 충돌 방지)
DROP VIEW IF EXISTS events_public;

-- 2. 컬럼 타입 변경: DATE[] -> TEXT[].
--    USING 절에서 서브쿼리 대신 직접 캐스트만 사용해야 Postgres가 거부하지 않는다.
--    이미 TEXT[]면 이 ALTER는 no-op처럼 동작한다(같은 타입으로 ALTER는 허용됨).
ALTER TABLE events
  ALTER COLUMN dates TYPE TEXT[]
  USING dates::TEXT[];

-- 3. 뷰 재생성 (004의 정의와 동일)
CREATE VIEW events_public AS
  SELECT id, title, dates, time_start, time_end, created_at,
         (password_hash IS NOT NULL) AS has_password,
         mode, date_only, created_by
  FROM events;

GRANT SELECT ON events_public TO anon;
