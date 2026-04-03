import { describe, it, expect } from 'vitest';

// Extract and test pure functions from DatePicker
// These are the same functions in DatePicker.tsx but testable without React

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('getDaysInMonth', () => {
  it('returns correct days for a 31-day month', () => {
    const days = getDaysInMonth(2026, 0); // January
    expect(days).toHaveLength(31);
    expect(days[0].getDate()).toBe(1);
    expect(days[30].getDate()).toBe(31);
  });

  it('returns correct days for February (non-leap)', () => {
    const days = getDaysInMonth(2026, 1); // Feb 2026
    expect(days).toHaveLength(28);
  });

  it('returns correct days for February (leap year)', () => {
    const days = getDaysInMonth(2028, 1); // Feb 2028
    expect(days).toHaveLength(29);
  });

  it('returns correct days for a 30-day month', () => {
    const days = getDaysInMonth(2026, 3); // April
    expect(days).toHaveLength(30);
  });

  it('all returned dates are in the correct month', () => {
    const days = getDaysInMonth(2026, 5); // June
    for (const day of days) {
      expect(day.getMonth()).toBe(5);
      expect(day.getFullYear()).toBe(2026);
    }
  });
});

describe('formatDateISO', () => {
  it('formats date with zero-padded month and day', () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateISO(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('handles single-digit months', () => {
    expect(formatDateISO(new Date(2026, 3, 4))).toBe('2026-04-04');
  });

  it('handles end of year', () => {
    expect(formatDateISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('handles start of year', () => {
    expect(formatDateISO(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
