'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProfile } from '@/hooks/useProfile';

export default function AuthButton() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, loading, supabase } = useAuthUser();
  const { profile } = useProfile();
  const displayName = (profile?.display_name?.trim()) || (user?.user_metadata?.full_name as string | undefined) || user?.email || '';
  const displayAvatar = profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  };

  const handleSignOut = async () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('whenmeets:')) localStorage.removeItem(key);
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="h-9 px-4 bg-teal-600 text-white text-sm font-semibold rounded-md shadow-(--shadow-primary) hover:bg-teal-700 hover:shadow-(--shadow-primary-hover) hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
      >
        로그인
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Profile avatar button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-teal-300 transition-colors cursor-pointer"
      >
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold">
            {(displayName?.[0] || user.email?.[0] || 'U').toString().toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 origin-top-right"
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName || user.email}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <a
              href="/dashboard"
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              대시보드
            </a>
            <a
              href="/mypage"
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              마이페이지
            </a>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              로그아웃
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
