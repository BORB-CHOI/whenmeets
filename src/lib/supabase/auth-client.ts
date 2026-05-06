import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

/**
 * Session-aware Supabase client for the browser (cookie-based via @supabase/ssr).
 * Uses the library's built-in `isSingleton: true` flag so every call returns
 * the same GoTrueClient instance — eliminating the
 * "Multiple GoTrueClient instances detected" warning.
 *
 * Use this for auth-aware operations (profile, dashboard queries).
 * For pure realtime/anon reads, use createBrowserClient from ./client.
 */
export function createAuthBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { isSingleton: true },
  );
}
