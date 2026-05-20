import { describe, it, expect } from 'vitest';
import { getStep, getStepColor, getStepLabels, resolveCellColor, getCellTextColor } from '@/lib/heatmap';

interface TestParticipant {
  id: string;
  name: string;
  availability: Record<string, Record<string, number>> | null;
}

function getCount(
  filtered: TestParticipant[],
  date: string,
  slot: number,
  includeIfNeeded: boolean,
): number {
  let count = 0;
  for (const p of filtered) {
    const val = p.availability?.[date]?.[String(slot)];
    if (val === 2) count++;
    else if (val === 1 && includeIfNeeded) count++;
  }
  return count;
}

describe('getCount', () => {
  const participants: TestParticipant[] = [
    { id: '1', name: 'A', availability: { '2026-04-04': { '18': 2, '19': 1 } } },
    { id: '2', name: 'B', availability: { '2026-04-04': { '18': 2, '19': 2 } } },
    { id: '3', name: 'C', availability: { '2026-04-04': { '18': 1, '19': 0 } } },
  ];

  it('counts only val === 2 when includeIfNeeded is false', () => {
    expect(getCount(participants, '2026-04-04', 18, false)).toBe(2);
    expect(getCount(participants, '2026-04-04', 19, false)).toBe(1);
  });

  it('counts val === 1 and 2 when includeIfNeeded is true', () => {
    expect(getCount(participants, '2026-04-04', 18, true)).toBe(3);
    expect(getCount(participants, '2026-04-04', 19, true)).toBe(2);
  });

  it('returns 0 for missing date', () => {
    expect(getCount(participants, '2026-04-05', 18, true)).toBe(0);
  });

  it('returns 0 for missing slot', () => {
    expect(getCount(participants, '2026-04-04', 99, true)).toBe(0);
  });

  it('handles null availability', () => {
    const withNull: TestParticipant[] = [
      { id: '1', name: 'A', availability: null },
    ];
    expect(getCount(withNull, '2026-04-04', 18, true)).toBe(0);
  });

  it('handles empty participants', () => {
    expect(getCount([], '2026-04-04', 18, true)).toBe(0);
  });

  it('does not count val === 0', () => {
    expect(getCount(participants, '2026-04-04', 19, true)).toBe(2);
  });
});

describe('getStep', () => {
  it('returns 0 when total is 0', () => {
    expect(getStep(5, 0)).toBe(0);
  });

  it('returns 0 when count is 0', () => {
    expect(getStep(0, 5)).toBe(0);
  });

  it('returns 5 when count equals total (만점)', () => {
    expect(getStep(5, 5)).toBe(5);
    expect(getStep(12, 12)).toBe(5);
  });

  describe('N=12 (사진 패턴 매칭)', () => {
    it('1-3 → step 1', () => {
      expect(getStep(1, 12)).toBe(1);
      expect(getStep(3, 12)).toBe(1);
    });
    it('4-6 → step 2', () => {
      expect(getStep(4, 12)).toBe(2);
      expect(getStep(6, 12)).toBe(2);
    });
    it('7-9 → step 3', () => {
      expect(getStep(7, 12)).toBe(3);
      expect(getStep(9, 12)).toBe(3);
    });
    it('10-11 → step 4', () => {
      expect(getStep(10, 12)).toBe(4);
      expect(getStep(11, 12)).toBe(4);
    });
    it('12 → step 5', () => {
      expect(getStep(12, 12)).toBe(5);
    });
  });

  describe('N=4', () => {
    it('1 → step 1, 2 → step 2, 3 → step 3, 4 → step 5', () => {
      expect(getStep(1, 4)).toBe(1);
      expect(getStep(2, 4)).toBe(2);
      expect(getStep(3, 4)).toBe(3);
      expect(getStep(4, 4)).toBe(5);
    });
  });

  describe('N=2', () => {
    it('1 → step 1, 2 → step 5', () => {
      expect(getStep(1, 2)).toBe(1);
      expect(getStep(2, 2)).toBe(5);
    });
  });
});

describe('getStepLabels', () => {
  it('N=12 → 사진 패턴 [1+, 4+, 7+, 10+, 12]', () => {
    expect(getStepLabels(12)).toEqual(['1+', '4+', '7+', '10+', '12']);
  });

  it('N=4 → 단일 카운트 step은 "+" 없이, 도달 불가능한 step 4는 빈 문자열', () => {
    expect(getStepLabels(4)).toEqual(['1', '2', '3', '', '4']);
  });

  it('N=0 → 빈 배열', () => {
    expect(getStepLabels(0)).toEqual([]);
  });
});

describe('getStepColor', () => {
  it('단계별 Material cyan hex 반환', () => {
    expect(getStepColor(0)).toBe('');
    expect(getStepColor(1)).toBe('#E0F7FA');
    expect(getStepColor(2)).toBe('#B2EBF2');
    expect(getStepColor(3)).toBe('#4DD0E1');
    expect(getStepColor(4)).toBe('#00ACC1');
    expect(getStepColor(5)).toBe('#00838F');
  });
});

describe('resolveCellColor — best 우선순위', () => {
  it('hasBestSlots=true + isBest=true → step 5 색', () => {
    expect(resolveCellColor({ count: 3, total: 12, isBest: true, hasBestSlots: true }))
      .toBe('#00838F');
  });
  it('hasBestSlots=true + isBest=false → undefined (흰색)', () => {
    expect(resolveCellColor({ count: 12, total: 12, isBest: false, hasBestSlots: true }))
      .toBe(undefined);
  });
  it('hasBestSlots=false → 단계별 색', () => {
    expect(resolveCellColor({ count: 3, total: 12, isBest: false, hasBestSlots: false }))
      .toBe('#E0F7FA');
  });
  it('hasBestSlots=false + count=0 → undefined (빈 칸)', () => {
    expect(resolveCellColor({ count: 0, total: 12, isBest: false, hasBestSlots: false }))
      .toBe(undefined);
  });
});

describe('getCellTextColor — 셀 배경 대비 텍스트 색', () => {
  it('가장 진한 5단계만 흰색 텍스트', () => {
    expect(getCellTextColor(getStepColor(5))).toBe('#FFFFFF');
  });
  it('1~4단계는 진한 텍스트', () => {
    expect(getCellTextColor(getStepColor(1))).toBe('#111827');
    expect(getCellTextColor(getStepColor(2))).toBe('#111827');
    expect(getCellTextColor(getStepColor(3))).toBe('#111827');
    expect(getCellTextColor(getStepColor(4))).toBe('#111827');
  });
  it('빈 셀(undefined)은 진한 텍스트', () => {
    expect(getCellTextColor(undefined)).toBe('#111827');
  });
  it('모든 단계에서 텍스트 색이 셀 배경색과 다름 (셀에 묻힘 회귀 방지)', () => {
    for (const step of [1, 2, 3, 4, 5] as const) {
      expect(getCellTextColor(getStepColor(step))).not.toBe(getStepColor(step));
    }
  });
});
