import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], consenting: [] as { id: string }[], updates: [] as Record<string, unknown>[], reads: 0, send: vi.fn<(rows: unknown[]) => Promise<boolean>>().mockResolvedValue(true) }));
vi.mock('@/server/measurement/chatgpt-ads', () => ({ sendChatGptConversions: fixtures.send }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => ({ from(table: string) {
  let update: Record<string, unknown> | null = null;
  const query = {
    select: () => query, in: () => query, eq: () => query, is: () => query, contains: () => query,
    lte: () => query, gte: () => query, not: () => query, order: () => query, limit: () => query, abortSignal: () => query,
    update: (value: Record<string, unknown>) => { update = value; return query; },
    then(resolve: (result: { data: Record<string, unknown>[] | null; error: null }) => unknown) {
      if (update) fixtures.updates.push(update);
      else fixtures.reads++;
      return Promise.resolve({ data: update ? null : table === 'measurement_visitors' ? fixtures.consenting : fixtures.rows, error: null }).then(resolve);
    },
  };
  return query;
} }) }));

import { flushConversions } from '@/server/measurement/service';

beforeEach(() => {
  vi.stubEnv('MEASUREMENT_ENABLED', 'true'); vi.stubEnv('CHATGPT_ADS_API_KEY', 'server-only'); vi.stubEnv('NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID', 'pixel'); vi.stubEnv('CHATGPT_ADS_VALIDATE_ONLY', 'false');
  fixtures.rows = [1, 2, 3].map((id) => ({ id: String(id), visitor_id: id === 3 ? 'revoked' : 'granted', name: 'event_created', ads_attempts: 0, context: { consent: true } }));
  fixtures.consenting = [{ id: 'granted' }]; fixtures.updates = []; fixtures.reads = 0;
  fixtures.send.mockClear(); fixtures.send.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe('전환 재전송 묶음', () => {
  it('같은 인스턴스의 동시 flush는 합치고 동의한 전환을 CAPI 한 번으로 보낸다', async () => {
    const first = flushConversions();
    expect(flushConversions()).toBe(first);
    await first;
    expect(fixtures.reads).toBe(2);
    expect(fixtures.send).toHaveBeenCalledTimes(1);
    expect(fixtures.send.mock.calls[0][0].map((row) => (row as { id: string }).id)).toEqual(['1', '2']);
    expect(fixtures.updates).toHaveLength(2);
    expect(fixtures.updates.every((row) => typeof row.ads_sent_at === 'string')).toBe(true);
  });
  it('전송 오류는 완료로 표시하지 않고 각 전환의 재시도 시각을 갱신한다', async () => {
    fixtures.send.mockResolvedValue(false);
    await flushConversions();
    expect(fixtures.updates.every((row) => row.ads_sent_at === undefined && row.ads_attempts === 1 && typeof row.ads_next_attempt_at === 'string')).toBe(true);
  });
  it('동의한 방문자가 없거나 검증 모드이면 전송 완료를 기록하지 않는다', async () => {
    fixtures.consenting = [];
    await flushConversions();
    expect(fixtures.send).not.toHaveBeenCalled();
    fixtures.consenting = [{ id: 'granted' }]; vi.stubEnv('CHATGPT_ADS_VALIDATE_ONLY', 'true');
    await flushConversions();
    expect(fixtures.updates.every((row) => row.ads_sent_at === undefined)).toBe(true);
  });
});
