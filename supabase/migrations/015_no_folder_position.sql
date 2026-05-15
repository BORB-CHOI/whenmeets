-- '폴더 없음' 그룹의 위치를 사용자별로 저장.
--
-- folders.position은 사용자가 만든 폴더들의 정렬값을 갖지만, '폴더 없음'은
-- folders 테이블에 행이 존재하지 않는 가상 그룹이므로 별도 컬럼이 필요하다.
-- profiles에 단일 INTEGER 컬럼을 추가해 디바이스 간 동기화한다.
--
-- NULL 의미: 사용자가 아직 '폴더 없음' 위치를 재정렬하지 않았음 → 항상 맨 아래.
-- 정수 값: folders.position과 같은 정수 공간을 공유. tie는 '폴더 없음'이 뒤로.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS no_folder_position INTEGER;
