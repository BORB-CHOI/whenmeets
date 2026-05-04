import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import MyPageClient from '@/components/mypage/MyPageClient';

export const metadata = {
  title: '마이페이지 - WhenMeets',
};

export default async function MyPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
        마이페이지
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        프로필 정보를 관리하세요.
      </p>
      <div className="mt-8">
        <MyPageClient
          email={user.email ?? ''}
          initialName={user.user_metadata?.full_name ?? ''}
          avatarUrl={user.user_metadata?.avatar_url ?? null}
        />
      </div>
    </div>
  );
}
