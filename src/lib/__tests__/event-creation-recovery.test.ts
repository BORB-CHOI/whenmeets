import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventSchema } from '@/server/validators/event.schema';

const rows = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock('@/server/repositories/events.repo', () => ({
  eventsRepo: {
    insert: vi.fn(async (row: Record<string, unknown>) => {
      if (rows.has(String(row.id))) throw Object.assign(new Error('duplicate'), { code: '23505' });
      rows.set(String(row.id), row);
    }),
    findById: vi.fn(async (id: string) => rows.get(id) ?? null),
  },
}));
vi.mock('@/server/repositories/participants.repo', () => ({ participantsRepo: {} }));
vi.mock('@/server/repositories/profiles.repo', () => ({ profilesRepo: {} }));
import { eventsService } from '@/server/services/events.service';
import { eventsRepo } from '@/server/repositories/events.repo';

const auth = { userId: null, hasEventToken: () => false };
const input = { title: '약속', dates: ['2026-11-09'], request_id: '9a84f88d-36f5-4f7a-a13b-222222222222' };

beforeEach(() => { rows.clear(); vi.clearAllMocks(); });

describe('생성 요청 중복 방지', () => {
  it('같은 요청이 재전송되면 기존 이벤트 id를 반환한다', async () => {
    const first = await eventsService.create(input, auth);
    expect(await eventsService.create(input, auth)).toEqual(first);
    expect(rows.size).toBe(1);
  });

  it('서로 다른 서버가 동시에 처리해도 한 건만 생성한다', async () => {
    const result = await Promise.all(Array.from({ length: 5 }, () => eventsService.create(input, auth)));
    expect(new Set(result.map((item) => item.id)).size).toBe(1);
    expect(rows.size).toBe(1);
  });

  it('다른 요청이나 변경된 내용, 다른 사용자는 별도 이벤트를 만든다', async () => {
    const first = await eventsService.create(input, auth);
    expect(await eventsService.create({ ...input, request_id: crypto.randomUUID() }, auth)).not.toEqual(first);
    expect(await eventsService.create({ ...input, title: '다른 약속' }, auth)).not.toEqual(first);
    expect(await eventsService.create(input, { ...auth, userId: 'owner' })).not.toEqual(first);
    expect(rows.size).toBe(4);
  });

  it('DB 장애를 성공으로 취급하지 않는다', async () => {
    vi.mocked(eventsRepo.insert).mockRejectedValueOnce(new Error('connection failed'));
    await expect(eventsService.create(input, auth)).rejects.toThrow('connection failed');
  });

  it('생략된 기본값과 명시한 기본값은 같은 요청으로 처리한다', async () => {
    const first = await eventsService.create(input, auth);
    const retried = await eventsService.create({ ...input, time_start: 36, time_end: 84, mode: 'available', date_only: false, start_on_monday: false }, auth);
    expect(retried).toEqual(first);
    expect(rows.size).toBe(1);
  });

  it('비밀번호를 바꾸면 기존 생성 결과를 반환하지 않는다', async () => {
    const first = await eventsService.create({ ...input, password: 'first' }, auth);
    expect(await eventsService.create({ ...input, password: 'second' }, auth)).not.toEqual(first);
  });

  it('기존 이벤트를 조회할 수 없는 충돌은 실패로 남긴다', async () => {
    vi.mocked(eventsRepo.insert).mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(eventsService.create(input, auth)).rejects.toThrow('duplicate');
  });

  it('잘못된 요청 식별자는 거부하고 기존 클라이언트는 허용한다', () => {
    expect(createEventSchema.safeParse({ ...input, request_id: 'bad' }).success).toBe(false);
    expect(createEventSchema.safeParse({ title: input.title, dates: input.dates }).success).toBe(true);
  });
});
