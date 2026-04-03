import { describe, it, expect } from 'vitest';

// Extract and test the pure state logic from useGridDrag
// The applyToCell logic is the core of the drag interaction

type Availability = Record<string, Record<string, number>>;

function applyToCell(
  draft: Availability,
  date: string,
  slot: number,
  activeMode: number,
  erasing: boolean,
): Availability {
  const result = { ...draft };
  if (!result[date]) result[date] = {};

  if (activeMode === 0 || erasing) {
    const dateCopy = { ...result[date] };
    delete dateCopy[String(slot)];
    if (Object.keys(dateCopy).length === 0) {
      delete result[date];
    } else {
      result[date] = dateCopy;
    }
  } else {
    result[date] = { ...result[date], [String(slot)]: activeMode };
  }

  return result;
}

describe('applyToCell (drag grid state logic)', () => {
  it('adds a slot with activeMode value', () => {
    const result = applyToCell({}, '2026-04-04', 18, 2, false);
    expect(result).toEqual({ '2026-04-04': { '18': 2 } });
  });

  it('adds ifNeeded (mode 1) value', () => {
    const result = applyToCell({}, '2026-04-04', 18, 1, false);
    expect(result).toEqual({ '2026-04-04': { '18': 1 } });
  });

  it('overwrites existing slot value', () => {
    const draft = { '2026-04-04': { '18': 1 } };
    const result = applyToCell(draft, '2026-04-04', 18, 2, false);
    expect(result['2026-04-04']['18']).toBe(2);
  });

  it('erases slot when erasing is true', () => {
    const draft = { '2026-04-04': { '18': 2, '19': 1 } };
    const result = applyToCell(draft, '2026-04-04', 18, 2, true);
    expect(result['2026-04-04']).toEqual({ '19': 1 });
  });

  it('removes date entry when last slot is erased', () => {
    const draft = { '2026-04-04': { '18': 2 } };
    const result = applyToCell(draft, '2026-04-04', 18, 2, true);
    expect(result['2026-04-04']).toBeUndefined();
  });

  it('erases when activeMode is 0 (erase mode)', () => {
    const draft = { '2026-04-04': { '18': 2 } };
    const result = applyToCell(draft, '2026-04-04', 18, 0, false);
    expect(result['2026-04-04']).toBeUndefined();
  });

  it('handles adding to date with existing slots', () => {
    const draft = { '2026-04-04': { '18': 2 } };
    const result = applyToCell(draft, '2026-04-04', 19, 1, false);
    expect(result['2026-04-04']).toEqual({ '18': 2, '19': 1 });
  });

  it('preserves other dates', () => {
    const draft = { '2026-04-04': { '18': 2 }, '2026-04-05': { '20': 1 } };
    const result = applyToCell(draft, '2026-04-04', 19, 2, false);
    expect(result['2026-04-05']).toEqual({ '20': 1 });
  });

  it('creates date entry for new date', () => {
    const draft = { '2026-04-04': { '18': 2 } };
    const result = applyToCell(draft, '2026-04-05', 20, 1, false);
    expect(result['2026-04-05']).toEqual({ '20': 1 });
  });

  it('does not mutate the original draft', () => {
    const draft = { '2026-04-04': { '18': 2 } };
    const original = JSON.parse(JSON.stringify(draft));
    applyToCell(draft, '2026-04-04', 19, 1, false);
    // The top-level object is spread, but nested is shared without deep clone in test
    // Just verify the function returns a new object
    expect(draft).toEqual(original);
  });
});
