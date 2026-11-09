import { describe, expect, it } from 'vitest';
import { applySavedAvailability } from '@/lib/event-availability';
import type { EventData, Availability } from '@/lib/types';

const event: EventData = {
  id: 'event', title: '약속', dates: ['2026-11-09'], time_start: 36, time_end: 84,
  has_password: false, created_at: '2026-11-09T00:00:00Z', mode: 'available', date_only: false, participants: [],
};
const availability: Availability = { '2026-11-09': { '36': 2 } };

describe('저장이 확인된 응답 반영', () => {
  it('최초 참여자의 응답도 재조회 없이 결과에 추가한다', () => {
    const updated = applySavedAvailability(event, { id: 'person', name: '참여자' }, availability);
    expect(updated.participants).toHaveLength(1);
    expect(updated.participants[0]).toMatchObject({ id: 'person', name: '참여자', availability });
    expect(event.participants).toHaveLength(0);
  });

  it('기존 참여자의 프로필과 다른 참여자의 응답은 보존한다', () => {
    const original = {
      ...event,
      participants: [
        { id: 'person', name: '원래 이름', availability: {}, created_at: event.created_at, avatar_url: 'avatar' },
        { id: 'other', name: '다른 참여자', availability: {}, created_at: event.created_at },
      ],
    };
    const updated = applySavedAvailability(original, { id: 'person', name: '참여자' }, availability);
    expect(updated.participants).toHaveLength(2);
    expect(updated.participants[0]).toEqual({ ...original.participants[0], availability });
    expect(updated.participants[1]).toBe(original.participants[1]);
  });
});
