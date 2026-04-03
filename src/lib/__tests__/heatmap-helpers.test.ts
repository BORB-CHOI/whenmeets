import { describe, it, expect } from 'vitest';

// Extract and test pure functions from HeatmapGrid
// Same logic as HeatmapGrid.tsx but testable without React

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

function getColor(count: number, total: number): string {
  if (total === 0 || count === 0) return 'bg-gray-50';
  const ratio = count / total;
  if (ratio <= 0.25) return 'bg-emerald-100';
  if (ratio <= 0.5) return 'bg-emerald-200';
  if (ratio <= 0.75) return 'bg-emerald-400';
  return 'bg-emerald-500';
}

describe('getCount', () => {
  const participants: TestParticipant[] = [
    { id: '1', name: 'A', availability: { '2026-04-04': { '18': 2, '19': 1 } } },
    { id: '2', name: 'B', availability: { '2026-04-04': { '18': 2, '19': 2 } } },
    { id: '3', name: 'C', availability: { '2026-04-04': { '18': 1, '19': 0 } } },
  ];

  it('counts only val === 2 when includeIfNeeded is false', () => {
    expect(getCount(participants, '2026-04-04', 18, false)).toBe(2); // A=2, B=2
    expect(getCount(participants, '2026-04-04', 19, false)).toBe(1); // B=2
  });

  it('counts val === 1 and 2 when includeIfNeeded is true', () => {
    expect(getCount(participants, '2026-04-04', 18, true)).toBe(3); // A=2, B=2, C=1
    expect(getCount(participants, '2026-04-04', 19, true)).toBe(2); // A=1, B=2
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
    expect(getCount(participants, '2026-04-04', 19, true)).toBe(2); // A=1, B=2, C=0
  });
});

describe('getColor', () => {
  it('returns gray when total is 0', () => {
    expect(getColor(5, 0)).toBe('bg-gray-50');
  });

  it('returns gray when count is 0', () => {
    expect(getColor(0, 5)).toBe('bg-gray-50');
  });

  it('returns emerald-100 for ratio <= 0.25', () => {
    expect(getColor(1, 4)).toBe('bg-emerald-100');
    expect(getColor(1, 5)).toBe('bg-emerald-100');
  });

  it('returns emerald-200 for ratio <= 0.5', () => {
    expect(getColor(2, 4)).toBe('bg-emerald-200');
    expect(getColor(1, 2)).toBe('bg-emerald-200');
  });

  it('returns emerald-400 for ratio <= 0.75', () => {
    expect(getColor(3, 4)).toBe('bg-emerald-400');
    expect(getColor(2, 3)).toBe('bg-emerald-400');
  });

  it('returns emerald-500 for ratio > 0.75', () => {
    expect(getColor(4, 4)).toBe('bg-emerald-500');
    expect(getColor(4, 5)).toBe('bg-emerald-500');
  });
});
