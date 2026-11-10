import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildChatGptConversion, sendChatGptConversions } from '@/server/measurement/chatgpt-ads';

const conversion = {
  id: '83e9baba-c561-497e-bdc6-d7a17bb2be3d', name: 'event_created',
  occurred_at: new Date().toISOString(), context: { consent: true, oppref: 'original-click-reference', obref: 'browser-reference' },
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('ChatGPT Ads 전환 규격', () => {
  it('빈 광고 참조는 생략하고 유효한 불투명 참조는 변형하지 않는다', () => {
    const empty = buildChatGptConversion({ ...conversion, context: { consent: true, oppref: '  ', obref: '\t' } }, 'https://daymeet.org');
    expect(empty.oppref).toBeUndefined();
    expect(empty.user).toBeUndefined();
    expect(buildChatGptConversion({ ...conversion, context: { consent: true, obref: ' original ' } }, 'https://daymeet.org').user?.obref).toBe(' original ');
  });
  it('커스텀 이벤트의 ID와 원본 광고 참조를 그대로 사용하고 접근 링크를 보내지 않는다', () => {
    expect(buildChatGptConversion(conversion, 'https://daymeet.org/e/secret')).toEqual({
      id: conversion.id, type: 'custom', custom_event_name: 'event_created',
      timestamp_ms: Date.parse(conversion.occurred_at), action_source: 'web', source_url: 'https://daymeet.org',
      oppref: 'original-click-reference', user: { obref: 'browser-reference' }, opt_out: true, data: { type: 'custom' },
    });
  });

  it('키가 없거나 서버 계측이 꺼져 있으면 네트워크 요청을 하지 않는다', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('MEASUREMENT_ENABLED', 'false');
    expect(await sendChatGptConversions([conversion])).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('API 키를 Authorization에만 넣고 공식 요청 규격으로 전송한다', async () => {
    vi.stubEnv('MEASUREMENT_ENABLED', 'true'); vi.stubEnv('CHATGPT_ADS_API_KEY', 'server-secret');
    vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', 'pixel-id'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', fetcher);
    expect(await sendChatGptConversions([conversion])).toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://bzr.openai.com/v1/events?pid=pixel-id');
    expect(init.headers.Authorization).toBe('Bearer server-secret');
    expect(init.body).not.toContain('server-secret');
    expect(JSON.parse(init.body).events[0].id).toBe(conversion.id);
  });

  it('외부 전송 실패는 성공으로 취급하지 않고 예외를 호출자에게 전파하지 않는다', async () => {
    vi.stubEnv('MEASUREMENT_ENABLED', 'true'); vi.stubEnv('CHATGPT_ADS_API_KEY', 'server-secret');
    vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', 'pixel-id'); vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://daymeet.org');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await sendChatGptConversions([conversion])).toBe(false);
  });
});
