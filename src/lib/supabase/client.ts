import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client for anonymous reads and realtime channels only.
 * Auth uses a dedicated storageKey so this client's GoTrueClient does NOT clash
 * with createAuthBrowserClient (which manages the actual user session via
 * @supabase/ssr cookies).
 *
 * Cached as a module-level singleton so repeated calls (e.g. from useRealtimeSync)
 * do not spawn multiple GoTrueClient instances under the same storage key, which
 * triggers the "Multiple GoTrueClient instances detected" warning.
 */
let cached: SupabaseClient | null = null;

export function createBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
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
  return cached;
}
