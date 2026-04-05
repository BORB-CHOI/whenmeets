import { describe, it, expect } from 'vitest';
import { slotToTime, generateSlots, formatDateCompact } from '../constants';

describe('slotToTime', () => {
  it('converts slot 0 to 00:00', () => {
    expect(slotToTime(0)).toBe('00:00');
  });

  it('converts slot 1 to 00:15', () => {
    expect(slotToTime(1)).toBe('00:15');
  });

  it('converts slot 4 to 01:00', () => {
    expect(slotToTime(4)).toBe('01:00');
  });

  it('converts slot 36 to 09:00', () => {
    expect(slotToTime(36)).toBe('09:00');
  });

  it('converts slot 84 to 21:00', () => {
    expect(slotToTime(84)).toBe('21:00');
  });

  it('converts slot 94 to 23:30', () => {
    expect(slotToTime(94)).toBe('23:30');
  });

  it('converts slot 96 to 24:00', () => {
    expect(slotToTime(96)).toBe('24:00');
  });
});

describe('generateSlots', () => {
  it('generates slots between start and end', () => {
    expect(generateSlots(18, 22)).toEqual([18, 19, 20, 21]);
  });

  it('returns empty array when start equals end', () => {
    expect(generateSlots(0, 0)).toEqual([]);
  });

  it('returns single slot when range is 1', () => {
    expect(generateSlots(5, 6)).toEqual([5]);
  });

  it('generates full day range', () => {
    const slots = generateSlots(0, 48);
    expect(slots.length).toBe(48);
    expect(slots[0]).toBe(0);
    expect(slots[47]).toBe(47);
  });
});

describe('formatDateCompact', () => {
  it('formats a known date correctly', () => {
    // 2026-04-04 is a Saturday
    const result = formatDateCompact('2026-04-04');
    expect(result).toMatch(/4\/4/);
    expect(result).toMatch(/토/);
  });

  it('formats a Monday', () => {
    // 2026-04-06 is a Monday
    const result = formatDateCompact('2026-04-06');
    expect(result).toMatch(/4\/6/);
    expect(result).toMatch(/월/);
  });

  it('handles first day of year', () => {
    const result = formatDateCompact('2026-01-01');
    expect(result).toMatch(/1\/1/);
  });
});
