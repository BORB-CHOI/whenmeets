import { describe, it, expect } from 'vitest';
import { reconcileSelection, toggleParticipant } from '../participantToggle';

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

describe('reconcileSelection', () => {
  const known = ['a', 'b', 'c'];

  it('A 단독 선택 중 새 참여자 D 가 들어와도 A 단독을 유지하고 D 만 더한다', () => {
    const next = reconcileSelection(new Set(['a']), known, ['a', 'b', 'c', 'd']);
    expect([...next].sort()).toEqual(['a', 'd']);
  });

  it('필터에서 뺀 참여자는 다른 사람이 저장해도 되살아나지 않는다', () => {
    const next = reconcileSelection(new Set(['a', 'c']), known, known);
    expect([...next].sort()).toEqual(['a', 'c']);
  });

  it('전체 선택 상태에서 새 참여자가 들어오면 전체 선택이 이어진다', () => {
    const next = reconcileSelection(new Set(known), known, ['a', 'b', 'c', 'd']);
    expect([...next].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('삭제된 참여자는 선택에서도 빠진다', () => {
    const next = reconcileSelection(new Set(['a', 'b', 'c']), known, ['a', 'b']);
    expect([...next].sort()).toEqual(['a', 'b']);
  });

  it('선택돼 있던 유일한 참여자가 삭제되면 전체 선택으로 복귀한다', () => {
    const next = reconcileSelection(new Set(['c']), known, ['a', 'b']);
    expect([...next].sort()).toEqual(['a', 'b']);
  });

  it('참여자가 모두 사라지면 빈 선택이 된다', () => {
    expect([...reconcileSelection(new Set(['a']), ['a'], [])]).toEqual([]);
  });

  it('입력 집합을 바꾸지 않는다', () => {
    const current = new Set(['a']);
    reconcileSelection(current, known, ['a', 'd']);
    expect([...current]).toEqual(['a']);
  });
});
