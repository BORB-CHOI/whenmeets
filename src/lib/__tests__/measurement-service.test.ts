import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fixtures = vi.hoisted(() => ({ consent: true, claimFails: false, row: {} as Record<string, unknown>, block: false, started: [] as string[] }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from(table: string) {
      let update: Record<string, unknown> | null = null;
      let signal: AbortSignal | undefined;
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        update: (value: Record<string, unknown>) => { update = value; return query; },
        abortSignal: (value: AbortSignal) => { signal = value; return query; },
        maybeSingle: async () => {
          fixtures.started.push(table);
          if (fixtures.block) await new Promise((_, reject) => { signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true }); });
          if (table === 'measurement_visitors') return { data: { consent: fixtures.consent }, error: null };
          if (update && fixtures.claimFails) return { data: null, error: null };
          if (update) Object.assign(fixtures.row, update);
          return { data: { ...fixtures.row }, error: null };
        },
      };
      return query;
    },
  }),
}));

import { collectConversions, measurementEnabled } from '@/server/measurement/service';

const visitor = '11111111-1111-4111-8111-111111111111';
function request() {
  return new NextRequest('https://daymeet.org/api/events', { headers: {
    cookie: `daymeet_measurement_visitor=${visitor}; daymeet_measurement_consent=granted`,
    'x-daymeet-measurement': encodeURIComponent(JSON.stringify({ consent: true, oppref: 'click' })),
  } });
}

beforeEach(() => {
  vi.stubEnv('MEASUREMENT_ENABLED', 'true');
  fixtures.consent = true; fixtures.claimFails = false; fixtures.block = false; fixtures.started = [];
  fixtures.row = { id: 'conversion-id', name: 'event_created', occurred_at: new Date().toISOString(), visitor_id: null, properties: {} };
});
afterEach(() => vi.unstubAllEnvs());

describe('서버 확정 전환 연결', () => {
  it('독립 읽기는 함께 시작하고 느린 계측 DB는 저장 응답을 계속 막지 않는다', async () => {
    fixtures.block = true;
    const result = collectConversions(request(), 'schedule', 'event_created', Date.now());
    expect(fixtures.started).toEqual(['measurement_visitors', 'measurement_events']);
    expect(await result).toEqual([]);
  });
  it('동의한 방문자가 확정 전환을 확보한 경우에만 같은 ID를 반환한다', async () => {
    const receipts = await collectConversions(request(), 'schedule', 'event_created', Date.now());
    expect(receipts.map((receipt) => receipt.id)).toEqual(['conversion-id']);
    expect(fixtures.row.visitor_id).toBe(visitor);
  });
  it('다른 방문자가 먼저 확보했거나 원자적 갱신에서 진 경우에는 영수증을 반환하지 않는다', async () => {
    fixtures.row.visitor_id = '22222222-2222-4222-8222-222222222222';
    expect(await collectConversions(request(), 'schedule', 'event_created', Date.now())).toEqual([]);
    fixtures.row.visitor_id = null; fixtures.claimFails = true;
    expect(await collectConversions(request(), 'schedule', 'event_created', Date.now())).toEqual([]);
  });
  it('같은 방문자의 응답 유실 재시도는 시간이 지나도 기존 ID를 재사용한다', async () => {
    fixtures.row.visitor_id = visitor;
    fixtures.row.occurred_at = new Date(Date.now() - 10000).toISOString();
    expect((await collectConversions(request(), 'schedule', 'event_created', Date.now()))[0].id).toBe('conversion-id');
  });
  it('동의를 철회했거나 과거의 미확인 전환이면 새 방문자에게 연결하지 않는다', async () => {
    fixtures.consent = false;
    expect(await collectConversions(request(), 'schedule', 'event_created', Date.now())).toEqual([]);
    fixtures.consent = true; fixtures.row.occurred_at = new Date(Date.now() - 10000).toISOString();
    expect(await collectConversions(request(), 'schedule', 'event_created', Date.now())).toEqual([]);
  });
  it('미리보기 환경에서는 명시적인 디버그 허용 없이는 서버 계측을 끈다', () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_DEBUG', 'false');
    expect(measurementEnabled()).toBe(false);
  });
});
