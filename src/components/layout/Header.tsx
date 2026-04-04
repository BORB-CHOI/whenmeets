import Link from 'next/link';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import AuthButton from '@/components/auth/AuthButton';
import CreateEventButton from './CreateEventButton';

export default async function Header() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 sm:h-16">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            WhenMeets
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors relative group cursor-pointer"
            >
              대시보드
              <span className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-indigo-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
          )}
        </div>

        {/* Right: Create + Auth */}
        <div className="flex items-center gap-3">
          <CreateEventButton />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
