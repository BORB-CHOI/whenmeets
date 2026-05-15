-- 사용자별 이벤트 순서 (대시보드 카드 정렬).
--
-- 폴더 안에서 카드 순서를 사용자가 직접 드래그로 바꿀 수 있게 하기 위한 테이블.
-- folder_id는 user_event_folders에서 관리하므로 여기서는 폴더 정보를 갖지 않는다.
-- position은 사용자 전체 이벤트 공간에서의 정렬값이라기보다, 클라이언트가 폴더별
-- 정렬을 만들 때 쓰는 보조 키로 사용된다 (정렬 안정성을 위해 정수 일괄 재할당).
--
-- 행이 없는 이벤트는 fallback으로 created_at desc 정렬.

CREATE TABLE IF NOT EXISTS public.user_event_order (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_order_user
  ON public.user_event_order(user_id);

ALTER TABLE public.user_event_order ENABLE ROW LEVEL SECURITY;
