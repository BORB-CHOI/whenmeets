import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Session-aware Supabase client for server components and route handlers.
 * Reads the user's auth session from cookies.
 * Use this for auth-gated operations (dashboard, user-owned data).
 * For admin operations (event CRUD via service role), use createServerClient.
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll can fail in Server Components (read-only cookies)
            // This is expected — the middleware handles session refresh
          }
        },
      },
    },
  );
}
