'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import type { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createAuthBrowserClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        redirectTo: window.location.origin + '/auth/callback',
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
        className="h-9 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-md shadow-(--shadow-primary) hover:bg-emerald-700 hover:shadow-(--shadow-primary-hover) hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
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
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:border-emerald-300 transition-colors cursor-pointer"
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
            {(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
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
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <a
              href="/dashboard"
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              대시보드
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
