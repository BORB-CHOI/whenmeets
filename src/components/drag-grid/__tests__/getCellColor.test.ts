import { describe, it, expect } from 'vitest';
import { getCellColorClass, getCellCssColor } from '../GridCell';

describe('getCellColorClass — available 모드', () => {
  it('-1 (미선택)', () => {
    expect(getCellColorClass(-1, 'available')).toBe('bg-[#FAD3D3]');
  });
  it('0', () => {
    expect(getCellColorClass(0, 'available')).toBe('bg-[#FAD3D3]');
  });
  it('1 (if needed)', () => {
    expect(getCellColorClass(1, 'available')).toBe('bg-[#FFE8B8]');
  });
  it('2 (available)', () => {
    expect(getCellColorClass(2, 'available')).toBe('bg-teal-600/[.47]');
  });
});

describe('getCellColorClass — unavailable 모드', () => {
  it('-1 (미선택)', () => {
    expect(getCellColorClass(-1, 'unavailable')).toBe('bg-teal-600/[.47]');
  });
  it('0 (명시)', () => {
    expect(getCellColorClass(0, 'unavailable')).toBe('bg-[#FAD3D3]');
  });
});

describe('getCellCssColor', () => {
  it('available -1', () => {
    expect(getCellCssColor(-1, 'available')).toBe('#FAD3D3');
  });
  it('available 1', () => {
    expect(getCellCssColor(1, 'available')).toBe('#FFE8B8');
  });
  it('available 2', () => {
    expect(getCellCssColor(2, 'available')).toBe('rgba(0,137,123,0.47)');
  });
  it('unavailable -1', () => {
    expect(getCellCssColor(-1, 'unavailable')).toBe('rgba(0,137,123,0.47)');
  });
  it('unavailable 0', () => {
    expect(getCellCssColor(0, 'unavailable')).toBe('#FAD3D3');
  });
});
