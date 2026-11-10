import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { GET } from '@/app/measurement/route';

afterEach(() => vi.unstubAllEnvs());

async function boot() {
  vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', 'pixel-example');
  vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_DEBUG', 'true');
  const response = GET();
  const html = await response.text();
  const parent = { postMessage: vi.fn() };
  const target = { parent, location: { origin: 'https://daymeet.org' }, addEventListener: vi.fn(), oaiq: undefined as undefined | (((...args: unknown[]) => void) & { q?: unknown[][] }) };
  const appendChild = vi.fn();
  runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)![1], { window: target, document: { createElement: () => ({}), head: { appendChild } } });
  const receive = target.addEventListener.mock.calls[0][1] as (event: unknown) => void;
  const send = (args: unknown[], origin = target.location.origin, source = parent) => receive({ origin, source, data: { type: 'daymeet-pixel-command', args } });
  return { response, html, target, appendChild, send };
}

describe('독립 픽셀 문서', () => {
  it('React·스타일·인증·광고 화면 없이 픽셀 SDK만 초기화한다', async () => {
    const { response, html, target, appendChild } = await boot();
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(html).not.toMatch(/_next|stylesheet|clarity\.ms|googlesyndication/);
    expect(appendChild.mock.calls[0][0].src).toBe('https://bzrcdn.openai.com/sdk/oaiq.min.js');
    expect(target.parent.postMessage).toHaveBeenCalledWith({ type: 'daymeet-pixel-ready' }, target.location.origin);
  });
  it('부모와 출처를 확인하고 허용된 이름·UUID만 전달한다', async () => {
    const { target, send } = await boot();
    const args = ['measure', 'custom', { type: 'custom' }, { custom_event_name: 'event_created', event_id: '11111111-1111-4111-8111-111111111111', opt_out: true }];
    send(args, 'https://other.example');
    send(args, target.location.origin, { postMessage: vi.fn() });
    send(['measure', 'custom', {}, { custom_event_name: 'email@example.com', event_id: 'invalid' }]);
    expect(target.oaiq!.q!.some((entry) => entry[0] === 'measure')).toBe(false);
    send(args);
    expect(target.oaiq!.q!.at(-1)).toEqual(args);
  });
  it('SDK 로딩 전 철회는 대기 전환을 지우고 로딩 후 철회도 실제 SDK에 전달한다', async () => {
    const { target, send } = await boot();
    send(['consent', true]);
    send(['measure', 'page_viewed']);
    send(['consent', false]);
    expect(target.oaiq!.q!.some((entry) => entry[0] === 'measure')).toBe(false);
    expect(target.oaiq!.q!.some((entry) => entry[0] === 'init')).toBe(true);
    const loaded = Object.assign(vi.fn(), { q: [] as unknown[][] });
    target.oaiq = loaded;
    send(['consent', false]);
    expect(loaded).toHaveBeenCalledWith('consent', false);
  });
  it('비활성 또는 유효하지 않은 Pixel ID로는 SDK를 넣지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'false');
    expect(await GET().text()).not.toContain('<script>');
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', '</script><script>invalid');
    expect(await GET().text()).not.toContain('<script>');
  });
});
