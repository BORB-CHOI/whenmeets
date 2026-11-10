import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeMeasurement, setMeasurementConsent, trackEvent } from '@/lib/measurement-client';
import { createPixelQueue } from '@/lib/measurement-pixel-queue';
import { runInNewContext } from 'node:vm';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('광고 SDK 런타임', () => {
  it('전환 측정을 거부해도 별도 운영 중인 Clarity 녹화 설정을 바꾸지 않는다', async () => {
    const local = new Map([['daymeet:measurement:consent', 'granted']]);
    const store = { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), removeItem: (key: string) => local.delete(key) };
    vi.stubGlobal('localStorage', store); vi.stubGlobal('sessionStorage', store);
    const clarity = vi.fn();
    vi.stubGlobal('window', { location: { origin: 'https://daymeet.org' }, navigator: {}, dispatchEvent: vi.fn(), clarity });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org');
    expect(await setMeasurementConsent(false)).toBe(true);
    expect(clarity).not.toHaveBeenCalled();
    expect(local.get('daymeet:measurement:consent')).toBe('denied');
  });
  it('외부 SDK가 예외를 던져도 사용자 동작을 중단하지 않고 내부 행동 기록을 시도한다', async () => {
    const local = new Map([['daymeet:measurement:consent', 'granted']]);
    const store = { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) };
    vi.stubGlobal('localStorage', store); vi.stubGlobal('sessionStorage', store);
    vi.stubGlobal('window', { location: { href: 'https://daymeet.org/', origin: 'https://daymeet.org', pathname: '/' }, navigator: {}, dispatchEvent: vi.fn(), gtag: () => { throw new Error('SDK unavailable'); } });
    vi.stubGlobal('document', { referrer: '', cookie: '' });
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetcher);
    await setMeasurementConsent(true);
    expect(() => trackEvent('availability_edit_started')).not.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('느린 픽셀이 준비되기 전에 동의를 철회하면 대기 전환을 전송하지 않는다', () => {
    let granted = true;
    const send = vi.fn();
    const queue = createPixelQueue(send, () => granted);
    queue.send(['consent', true]);
    queue.send(['measure', 'custom', { type: 'custom' }, { custom_event_name: 'event_created' }]);
    granted = false;
    queue.send(['consent', false]);
    queue.ready();
    expect(send.mock.calls.map(([args]) => args)).toEqual([['consent', false]]);
  });

  it('외부 탭에서 동의가 철회된 경우에도 준비 시 대기 전환을 폐기한다', () => {
    let granted = true;
    const send = vi.fn(); const queue = createPixelQueue(send, () => granted);
    queue.send(['measure', 'page_viewed', { type: 'contents' }]);
    granted = false; queue.ready();
    expect(send.mock.calls.map(([args]) => args)).toEqual([['consent', false]]);
  });

  it('Google 태그에 공식 Arguments 형식으로 초기화 명령을 전달한다', () => {
    const local = new Map([['daymeet:measurement:consent', 'granted']]);
    const store = { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) };
    vi.stubGlobal('localStorage', store); vi.stubGlobal('sessionStorage', store);
    const target = { location: { href: 'https://daymeet.org/', origin: 'https://daymeet.org', pathname: '/' }, navigator: {}, dataLayer: [] as unknown[] };
    vi.stubGlobal('window', target);
    vi.stubGlobal('document', { referrer: '', cookie: '', getElementById: () => null, createElement: () => ({}), head: { appendChild: (script: { textContent?: string }) => { if (script.textContent) runInNewContext(script.textContent, { window: target }); } } });
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org'); vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-EXAMPLE'); vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', '');
    initializeMeasurement();
    expect(target.dataLayer.length).toBeGreaterThan(0);
    expect(target.dataLayer.every((entry) => Object.prototype.toString.call(entry) === '[object Arguments]')).toBe(true);
  });

  it.each(['granted', 'denied'])('이전 선택이 %s여도 늦게 끝난 허용 요청이 다른 탭의 거부를 덮어쓰지 않는다', async (previousChoice) => {
    const local = new Map([['daymeet:measurement:consent', previousChoice]]);
    vi.stubGlobal('localStorage', { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value) });
    vi.stubGlobal('window', { location: { origin: 'https://daymeet.org' }, navigator: {}, dispatchEvent: vi.fn() });
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true'); vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org');
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; })).mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    const pending = setMeasurementConsent(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    local.set('daymeet:measurement:consent', 'denied');
    local.set('daymeet:measurement:denial', 'another-tab-denial');
    finish(new Response(null, { status: 204 }));
    expect(await pending).toBe(false);
    expect(local.get('daymeet:measurement:consent')).toBe('denied');
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ consent: false });
  });
});
