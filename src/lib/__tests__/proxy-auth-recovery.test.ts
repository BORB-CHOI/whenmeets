import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import type { CookieMethodsServer } from '@supabase/ssr';

const auth = vi.hoisted(() => ({ getUser: vi.fn(), cookies: null as CookieMethodsServer | null }));
const createClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/ssr', () => ({ createServerClient: createClient }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ allowed: true }) }));

import { config, proxy } from '@/proxy';

const cookieName = 'sb-project-auth-token';
const expiredCookie = `${cookieName}=expired; event-access=keep`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  createClient.mockImplementation((_url, _key, options: { cookies: CookieMethodsServer }) => {
    auth.cookies = options.cookies;
    return { auth: { getUser: auth.getUser } };
  });
});

afterEach(() => vi.unstubAllEnvs());

describe('페이지 렌더 전 로그인 세션 복구', () => {
  it('공개·이벤트 페이지도 프록시에서 처리하고 정적 파일은 제외한다', () => {
    for (const url of ['/', '/demo', '/new', '/e/example', '/dashboard', '/mypage', '/auth/callback?code=test']) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
    for (const url of ['/_next/static/chunk.js', '/_next/image?url=x', '/favicon.ico', '/image.png', '/api/user/profile', '/measurement?oppref=test']) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
    expect(unstable_doesMiddlewareMatch({ config, url: '/api/events' })).toBe(true);
  });

  it('익명 방문과 다른 프로젝트 쿠키에는 인증 서버를 호출하지 않는다', async () => {
    for (const cookie of ['', 'sb-other-auth-token=other', `${cookieName}-code-verifier=oauth`]) {
      await proxy(new NextRequest('http://localhost:3000/dashboard', { headers: { cookie } }));
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it('일반 페이지에서도 폐기된 세션을 렌더 전에 정리하고 응답 캐시를 막는다', async () => {
    auth.getUser.mockImplementation(async () => {
      await auth.cookies!.setAll!([{ name: cookieName, value: '', options: { path: '/', maxAge: 0 } }], {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache',
      });
      return { data: { user: null }, error: { code: 'refresh_token_not_found' } };
    });
    const request = new NextRequest('http://localhost:3000/demo', { headers: { cookie: expiredCookie } });
    const response = await proxy(request);
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(response.cookies.get(cookieName)?.value).toBe('');
    expect(request.cookies.get(cookieName)?.value).toBe('');
    expect(request.cookies.get('event-access')?.value).toBe('keep');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
  });

  it('분할 저장된 세션 쿠키도 갱신하고 유효한 세션은 보존한다', async () => {
    const request = new NextRequest('http://localhost:3000/e/example', { headers: { cookie: `${cookieName}.0=part1; ${cookieName}.1=part2` } });
    const response = await proxy(request);
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(request.cookies.get(`${cookieName}.0`)?.value).toBe('part1');
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it('OAuth 콜백은 코드 교환 전에 이전 세션을 갱신하지 않는다', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback?code=new', {
      headers: { cookie: `${expiredCookie}; ${cookieName}-code-verifier=new-verifier` },
    });
    await proxy(request);
    expect(createClient).not.toHaveBeenCalled();
    expect(request.cookies.get(`${cookieName}-code-verifier`)?.value).toBe('new-verifier');
  });
});
