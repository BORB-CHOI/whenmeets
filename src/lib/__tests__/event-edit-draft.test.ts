import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEditDraft, readEditDraft, saveEditDraft } from '@/lib/event-edit-draft';
import type { Availability, EventData } from '@/lib/types';

const event: EventData = {
  id: 'event', title: '약속', dates: ['2026-11-10'], time_start: 36, time_end: 84,
  has_password: false, created_at: '', mode: 'available', date_only: false, participants: [],
};
const availability: Availability = { '2026-11-10': { '36': 2, '40': 1 } };
let values: Map<string, string>;

beforeEach(() => {
  values = new Map();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('로그인 왕복 중 시간 선택 보존', () => {
  it('빈 선택과 선택한 시간을 복원하고 성공 또는 취소 후 지운다', () => {
    expect(saveEditDraft(event, availability)).toBe(true);
    expect(readEditDraft(event)).toEqual(availability);
    expect(readEditDraft({ ...event, id: 'other' })).toBeNull();
    clearEditDraft(event.id);
    expect(readEditDraft(event)).toBeNull();
    expect(saveEditDraft(event, {})).toBe(true);
    expect(readEditDraft(event)).toEqual({});
  });
  it('이벤트 시간·날짜·입력 방식이 바뀌면 예전 선택을 복원하지 않는다', () => {
    for (const change of [{ time_end: 80 }, { dates: ['2026-11-11'] }, { date_only: true }, { mode: 'unavailable' as const }]) {
      saveEditDraft(event, availability);
      expect(readEditDraft({ ...event, ...change })).toBeNull();
    }
  });
  it('하루가 지난 선택이나 손상된 저장값을 무시한다', () => {
    saveEditDraft(event, availability);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    expect(readEditDraft(event)).toBeNull();
    vi.restoreAllMocks();
    saveEditDraft(event, availability);
    const key = [...values.keys()][0];
    values.set(key, '{broken');
    expect(readEditDraft(event)).toBeNull();
  });
  it('저장소가 차단되면 로그인 이동 전에 실패를 알릴 수 있다', () => {
    vi.stubGlobal('sessionStorage', { setItem: () => { throw new Error('blocked'); }, getItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } });
    expect(saveEditDraft(event, availability)).toBe(false);
    expect(readEditDraft(event)).toBeNull();
    expect(() => clearEditDraft(event.id)).not.toThrow();
  });
  it('현재 이벤트에 없는 날짜·슬롯이나 잘못된 단계는 복원하지 않는다', () => {
    for (const invalid of [{ '2026-11-11': { '36': 2 } }, { '2026-11-10': { '35': 2 } }, { '2026-11-10': { '84': 2 } }, { '2026-11-10': { '36': 3 } }]) {
      saveEditDraft(event, availability);
      const key = [...values.keys()][0];
      values.set(key, JSON.stringify({ ...JSON.parse(values.get(key)!), availability: invalid }));
      expect(readEditDraft(event)).toBeNull();
    }
  });
  it('날짜 전용·요일 이벤트의 단계와 날짜 선택을 그대로 복원한다', () => {
    const dateOnly = { ...event, date_only: true, dates: ['mon', 'wed'] };
    const chosen: Availability = { mon: { all_day: 1 }, wed: { all_day: 0 } };
    saveEditDraft(dateOnly, chosen);
    expect(readEditDraft(dateOnly)).toEqual(chosen);
  });
});
