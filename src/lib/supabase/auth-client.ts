import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

/**
 * Session-aware Supabase client for the browser.
 * Uses @supabase/ssr for automatic cookie-based auth session management.
 * Use this for auth-related operations (sign in, get user, dashboard queries).
 * For non-auth operations (realtime, anon reads), use the regular createBrowserClient.
 */
export function createAuthBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
