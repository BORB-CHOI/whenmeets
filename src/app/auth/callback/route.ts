import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getRedirectOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname;
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  if (isLocalhost) {
    return requestUrl.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const siteUrl = getRedirectOrigin(request);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the page the user came from, or dashboard as fallback
      // Only allow relative paths to prevent open redirect
      const destination = next && next.startsWith('/') ? next : '/dashboard';
      return NextResponse.redirect(`${siteUrl}${destination}`);
    }
  }

  // If no code or exchange failed, redirect to home
  return NextResponse.redirect(`${siteUrl}/`);
}
