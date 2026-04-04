'use client';

import { useEffect, useRef, useState } from 'react';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import type { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createAuthBrowserClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    // Clear all whenmeets participant sessions
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('whenmeets:')) localStorage.removeItem(key);
    }
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="h-[38px] w-24 rounded-md bg-gray-100 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="h-[38px] px-5 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
      >
        로그인
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.user_metadata?.avatar_url && (
        <img
          src={user.user_metadata.avatar_url}
          alt=""
          className="w-8 h-8 rounded-full"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="text-sm font-medium text-gray-900 hidden sm:inline">
        {user.user_metadata?.full_name || user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="h-[38px] px-3 text-sm text-gray-500 border border-gray-200 rounded-md hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer"
      >
        로그아웃
      </button>
    </div>
  );
}
