import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Proxy (Next.js 16+) — replaces the deprecated `middleware.ts` convention.
 *
 * Responsibilities:
 * 1. Refresh the Supabase Auth session on auth-gated routes so server
 *    components see fresh cookies.
 * 2. Apply per-IP rate limits on abuse-prone POST endpoints.
 */

interface RatePolicy {
  name: string;
  match: (path: string, method: string) => boolean;
  limit: number;
  windowMs: number;
}

const RATE_POLICIES: RatePolicy[] = [
  {
    name: 'verify',
    match: (p, m) => m === 'POST' && /^\/api\/events\/[^/]+\/verify$/.test(p),
    limit: 8,
    windowMs: 60_000,
  },
  {
    name: 'participants',
    match: (p, m) => m === 'POST' && /^\/api\/events\/[^/]+\/participants$/.test(p),
    limit: 30,
    windowMs: 60_000,
  },
  {
    name: 'events-create',
    match: (p, m) => m === 'POST' && p === '/api/events',
    limit: 20,
    windowMs: 60_000,
  },
  {
    name: 'folders-create',
    match: (p, m) => m === 'POST' && p === '/api/folders',
    limit: 20,
    windowMs: 60_000,
  },
];

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function applyRateLimit(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const method = req.method;
  for (const policy of RATE_POLICIES) {
    if (!policy.match(pathname, method)) continue;
    const ip = getClientIp(req);
    const result = rateLimit({
      key: `${policy.name}:${ip}`,
      limit: policy.limit,
      windowMs: policy.windowMs,
    });
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      return new NextResponse(
        JSON.stringify({ error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
          },
        },
      );
    }
    return null;
  }
  return null;
}

async function refreshSupabaseSession(request: NextRequest) {
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

  await supabase.auth.getUser();
  return supabaseResponse;
}

export async function proxy(request: NextRequest) {
  // Rate limit first — cheaper than spinning up a Supabase client when blocked.
  const limited = applyRateLimit(request);
  if (limited) return limited;

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/mypage') ||
    pathname.startsWith('/auth')
  ) {
    return refreshSupabaseSession(request);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Auth refresh routes
    '/dashboard/:path*',
    '/mypage/:path*',
    '/auth/:path*',
    // Rate-limited API routes
    '/api/events',
    '/api/events/:path*/verify',
    '/api/events/:path*/participants',
    '/api/folders',
  ],
};
