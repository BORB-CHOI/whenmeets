import { describe, it, expect } from 'vitest';
import { toggleParticipant } from '../participantToggle';

const ALL = ['a', 'b', 'c', 'd'];

describe('toggleParticipant', () => {
  it('전체 선택 → A 클릭 = A 단독 (다른 모두 해제)', () => {
    const next = toggleParticipant(new Set(ALL), 'a', ALL);
    expect([...next]).toEqual(['a']);
  });

  it('A 단독 → B 클릭 = A+B 추가', () => {
    const next = toggleParticipant(new Set(['a']), 'b', ALL);
    expect([...next].sort()).toEqual(['a', 'b']);
  });

  it('A+B → A 클릭 = B만 (A 제거)', () => {
    const next = toggleParticipant(new Set(['a', 'b']), 'a', ALL);
    expect([...next]).toEqual(['b']);
  });

  it('A 단독 → A 클릭 = 모두 해제 → 자동 전체 복귀', () => {
    const next = toggleParticipant(new Set(['a']), 'a', ALL);
    expect([...next].sort()).toEqual([...ALL].sort());
  });

  it('A+B+C → C 추가 클릭 = 전체 선택 (4명) → 다른 사람 클릭 시 단독 모드로 전환되는 게 아님 (이미 추가만)', () => {
    const next = toggleParticipant(new Set(['a', 'b', 'c']), 'd', ALL);
    expect([...next].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
