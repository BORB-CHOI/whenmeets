import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Availability } from '@/lib/types';
import { ApiClientError } from '@/lib/api-client/client';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = value; }];
  },
  useRef: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  },
  useCallback: (callback: unknown) => callback,
}));

const api = vi.hoisted(() => ({ save: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/api-client', () => ({
  participantsApi: { updateAvailability: api.save },
  eventsApi: { create: api.create },
}));

import { useAvailabilitySave } from '../useAvailabilitySave';
import { useEventCreation } from '../useEventCreation';

const availability: Availability = { '2026-11-09': { '36': 2 } };
const input = { title: '약속', dates: ['2026-11-09'] };
function SaveHarness(participantId: string | null = 'person') {
  return useAvailabilitySave({ eventId: 'event', participantId, participantPassword: null });
}
function CreateHarness() {
  return useEventCreation();
}
function renderSave(participantId: string | null = 'person') {
  state.cursor = 0;
  return SaveHarness(participantId);
}
function renderCreate() {
  state.cursor = 0;
  return CreateHarness();
}

beforeEach(() => {
  state.slots = [];
  state.cursor = 0;
  vi.resetAllMocks();
});

describe('가용성 저장 복구', () => {
  it('서버 오류 메시지를 표시하고 취소하면 지울 수 있다', async () => {
    api.save.mockRejectedValueOnce(new ApiClientError(401, { code: 'UNAUTHORIZED', message: '다시 로그인해 주세요' }));
    expect(await renderSave().saveNow(availability)).toBe(false);
    expect(renderSave().error).toBe('다시 로그인해 주세요');
    renderSave().clearError();
    expect(renderSave().error).toBeNull();
  });

  it('참여자 정보가 없으면 성공을 반환하지 않는다', async () => {
    const hook = renderSave(null);
    expect(await hook.saveNow(availability)).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
  });
  it('실패를 알리고 같은 입력으로 다시 저장할 수 있다', async () => {
    api.save.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ ok: true });
    const hook = renderSave();
    expect(await hook.saveNow(availability)).toBe(false);
    expect(renderSave().error).toContain('저장');
    expect(renderSave().saving).toBe(false);
    expect(await renderSave().saveNow(availability)).toBe(true);
    expect(renderSave().error).toBeNull();
    expect(api.save).toHaveBeenNthCalledWith(2, 'event', 'person', availability, undefined);
  });

  it('저장이 진행 중이면 겹치는 요청을 보내지 않는다', async () => {
    let complete!: () => void;
    api.save.mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    const hook = renderSave();
    const pending = hook.saveNow(availability);
    expect(await hook.saveNow(availability)).toBe(false);
    expect(api.save).toHaveBeenCalledTimes(1);
    complete();
    expect(await pending).toBe(true);
  });
});

describe('이벤트 생성 재시도', () => {
  it('새 폼을 열면 새로운 요청 식별자로 생성한다', async () => {
    api.create.mockResolvedValue({ id: 'created' });
    await renderCreate().createEvent(input);
    renderCreate().resetCreation();
    await renderCreate().createEvent(input);
    expect(api.create.mock.calls[1][0].request_id).not.toBe(api.create.mock.calls[0][0].request_id);
  });
  it('응답 유실 후 같은 생성 요청 식별자를 재사용한다', async () => {
    api.create.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ id: 'created' });
    const hook = renderCreate();
    await expect(hook.createEvent(input)).rejects.toThrow();
    await expect(renderCreate().createEvent(input)).resolves.toEqual({ id: 'created' });
    const first = api.create.mock.calls[0][0];
    expect(first.request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(api.create.mock.calls[1][0].request_id).toBe(first.request_id);
  });

  it('동시에 누르면 하나의 생성 요청만 보낸다', async () => {
    api.create.mockResolvedValue({ id: 'created' });
    const hook = renderCreate();
    await Promise.all([hook.createEvent(input), hook.createEvent(input)]);
    expect(api.create).toHaveBeenCalledTimes(1);
  });
});
