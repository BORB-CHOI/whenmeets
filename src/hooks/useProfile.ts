'use client';

import { useEffect, useState } from 'react';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createAuthBrowserClient();
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('useProfile load failed:', error.message);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        load();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}
