import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (Next.js 16+) — refreshes Supabase Auth session on every request,
 * ensuring auth cookies stay fresh without requiring client-side refresh.
 *
 * Replaces the deprecated `middleware.ts` convention.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — this updates the auth cookies if needed
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Keep Supabase session refresh off public pages; auth-gated surfaces
    // still get fresh cookies before they read the user server-side.
    '/dashboard/:path*',
    '/mypage/:path*',
    '/auth/:path*',
  ],
};
