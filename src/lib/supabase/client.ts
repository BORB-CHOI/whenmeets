import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client for anonymous reads and realtime channels only.
 * Auth uses a dedicated storageKey so this client's GoTrueClient does NOT clash
 * with createAuthBrowserClient (which manages the actual user session via
 * @supabase/ssr cookies). This avoids the
 * "Multiple GoTrueClient instances detected ... under the same storage key" warning.
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storageKey: 'whenmeets-anon',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
