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
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 hover:text-emerald-600 transition-colors cursor-pointer py-2"
          >
            <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center text-white text-xs font-extrabold shrink-0">
              W
            </div>
            WhenMeets
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors relative group cursor-pointer"
            >
              대시보드
              <span className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-emerald-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
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
