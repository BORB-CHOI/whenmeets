import { describe, it, expect } from 'vitest';
import { getCellColorClass, getCellCssColor } from '../GridCell';

describe('getCellColorClass — available 모드', () => {
  it('-1 (미선택) = red-400/45', () => {
    expect(getCellColorClass(-1, 'available')).toBe('bg-red-400/45');
  });
  it('0 (사실상 발생 X 이지만 동일)', () => {
    expect(getCellColorClass(0, 'available')).toBe('bg-red-400/45');
  });
  it('1 (if needed) = amber-300/55', () => {
    expect(getCellColorClass(1, 'available')).toBe('bg-amber-300/55');
  });
  it('2 (available) = teal-600/[.47]', () => {
    expect(getCellColorClass(2, 'available')).toBe('bg-teal-600/[.47]');
  });
});

describe('getCellColorClass — unavailable 모드', () => {
  it('-1 (미선택) = teal-600/[.47]', () => {
    expect(getCellColorClass(-1, 'unavailable')).toBe('bg-teal-600/[.47]');
  });
  it('0 (명시) = red-400/45', () => {
    expect(getCellColorClass(0, 'unavailable')).toBe('bg-red-400/45');
  });
});

describe('getCellCssColor', () => {
  it('available -1 → 빨강 rgba', () => {
    expect(getCellCssColor(-1, 'available')).toBe('rgba(248,113,113,0.45)');
  });
  it('available 2 → teal rgba', () => {
    expect(getCellCssColor(2, 'available')).toBe('rgba(0,137,123,0.47)');
  });
  it('unavailable -1 → teal rgba', () => {
    expect(getCellCssColor(-1, 'unavailable')).toBe('rgba(0,137,123,0.47)');
  });
  it('unavailable 0 → 빨강 rgba', () => {
    expect(getCellCssColor(0, 'unavailable')).toBe('rgba(248,113,113,0.45)');
  });
});
