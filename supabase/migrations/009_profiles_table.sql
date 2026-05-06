-- public.profiles 테이블 도입.
-- Supabase가 OAuth 재로그인마다 auth.users.raw_user_meta_data에 IdP 클레임을 머지하기 때문에
-- user_metadata.full_name 같은 키로 사용자 닉네임을 저장하면 매 로그인마다 IdP 원본으로 덮어써진다.
-- 사용자가 직접 관리하는 표시 이름/아바타 등은 별도 테이블로 분리해 IdP 영향권 밖에 둔다.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.profiles_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_set_updated_at();

-- 신규 가입 시 자동으로 profiles 행 생성. 초기 display_name은 IdP 클레임에서 1회만 시드.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 사용자 백필: profiles 행이 없는 사용자에 대해 IdP 데이터로 1회 시드.
-- 이미 profiles 행이 있으면 건드리지 않음 (사용자 변경값 보존).
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- RLS: 본인만 자기 행 select/update 가능. insert/delete는 trigger와 cascade로만.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
