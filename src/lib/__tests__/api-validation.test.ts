import { describe, it, expect } from 'vitest';

// Test the validation logic extracted from API routes
// These test the same conditional branches as route handlers without needing Next.js runtime

describe('POST /api/events validation logic', () => {
  function validateEventCreation(body: Record<string, unknown>) {
    const { title, dates, time_start, time_end } = body;

    if (!title || !dates || !Array.isArray(dates) || dates.length === 0) {
      return { error: 'Title and dates are required', status: 400 };
    }
    if (typeof title === 'string' && title.trim().length > 200) {
      return { error: 'Title is too long', status: 400 };
    }
    if ((dates as unknown[]).length > 60) {
      return { error: 'Too many dates (max 60)', status: 400 };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!(dates as unknown[]).every((d: unknown) => typeof d === 'string' && dateRegex.test(d))) {
      return { error: 'Invalid date format', status: 400 };
    }
    const start = (time_start ?? 18) as number;
    const end = (time_end ?? 42) as number;
    if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end > 48 || start >= end) {
      return { error: 'Invalid time range', status: 400 };
    }
    return { status: 200 };
  }

  it('rejects missing title', () => {
    const result = validateEventCreation({ dates: ['2026-04-04'] });
    expect(result.status).toBe(400);
  });

  it('rejects empty title', () => {
    const result = validateEventCreation({ title: '', dates: ['2026-04-04'] });
    expect(result.status).toBe(400);
  });

  it('rejects missing dates', () => {
    const result = validateEventCreation({ title: 'Test' });
    expect(result.status).toBe(400);
  });

  it('rejects empty dates array', () => {
    const result = validateEventCreation({ title: 'Test', dates: [] });
    expect(result.status).toBe(400);
  });

  it('rejects non-array dates', () => {
    const result = validateEventCreation({ title: 'Test', dates: 'not-array' });
    expect(result.status).toBe(400);
  });

  it('rejects title > 200 chars', () => {
    const result = validateEventCreation({
      title: 'a'.repeat(201),
      dates: ['2026-04-04'],
    });
    expect(result.status).toBe(400);
  });

  it('accepts title exactly 200 chars', () => {
    const result = validateEventCreation({
      title: 'a'.repeat(200),
      dates: ['2026-04-04'],
    });
    expect(result.status).toBe(200);
  });

  it('rejects > 60 dates', () => {
    const dates = Array.from({ length: 61 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
    const result = validateEventCreation({ title: 'Test', dates });
    expect(result.status).toBe(400);
  });

  it('rejects invalid date format', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['04/04/2026'],
    });
    expect(result.status).toBe(400);
  });

  it('rejects mixed valid/invalid dates', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04', 'bad'],
    });
    expect(result.status).toBe(400);
  });

  it('uses default time range when not provided', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04'],
    });
    expect(result.status).toBe(200);
  });

  it('rejects start >= end', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04'],
      time_start: 42,
      time_end: 18,
    });
    expect(result.status).toBe(400);
  });

  it('rejects start === end', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04'],
      time_start: 18,
      time_end: 18,
    });
    expect(result.status).toBe(400);
  });

  it('rejects negative start', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04'],
      time_start: -1,
      time_end: 42,
    });
    expect(result.status).toBe(400);
  });

  it('rejects end > 48', () => {
    const result = validateEventCreation({
      title: 'Test',
      dates: ['2026-04-04'],
      time_start: 18,
      time_end: 49,
    });
    expect(result.status).toBe(400);
  });

  it('accepts valid full payload', () => {
    const result = validateEventCreation({
      title: 'Team Meeting',
      dates: ['2026-04-04', '2026-04-05'],
      time_start: 18,
      time_end: 42,
    });
    expect(result.status).toBe(200);
  });

  it('accepts boundary time range 0-48', () => {
    const result = validateEventCreation({
      title: 'All day',
      dates: ['2026-04-04'],
      time_start: 0,
      time_end: 48,
    });
    expect(result.status).toBe(200);
  });
});

describe('Availability validation logic', () => {
  function validateAvailability(availability: unknown): { valid: boolean; error?: string } {
    if (typeof availability !== 'object' || availability === null || Array.isArray(availability)) {
      return { valid: false, error: 'Availability must be an object' };
    }
    const dateKeys = Object.keys(availability as Record<string, unknown>);
    if (dateKeys.length > 60) {
      return { valid: false, error: 'Too many date keys' };
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const key of dateKeys) {
      if (!dateRegex.test(key)) {
        return { valid: false, error: 'Invalid date key format' };
      }
      const slots = (availability as Record<string, unknown>)[key];
      if (typeof slots !== 'object' || slots === null || Array.isArray(slots)) {
        return { valid: false, error: 'Slots must be an object' };
      }
      for (const val of Object.values(slots as Record<string, unknown>)) {
        if (val !== 0 && val !== 1 && val !== 2) {
          return { valid: false, error: 'Invalid slot value' };
        }
      }
    }
    return { valid: true };
  }

  it('accepts valid availability', () => {
    const result = validateAvailability({ '2026-04-04': { '18': 2, '19': 1, '20': 0 } });
    expect(result.valid).toBe(true);
  });

  it('rejects null', () => {
    expect(validateAvailability(null).valid).toBe(false);
  });

  it('rejects array', () => {
    expect(validateAvailability([]).valid).toBe(false);
  });

  it('rejects string', () => {
    expect(validateAvailability('hello').valid).toBe(false);
  });

  it('rejects > 60 date keys', () => {
    const avail: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 61; i++) {
      avail[`2026-01-${String(i + 1).padStart(2, '0')}`] = { '18': 2 };
    }
    expect(validateAvailability(avail).valid).toBe(false);
  });

  it('rejects invalid date key format', () => {
    expect(validateAvailability({ 'bad-date': { '18': 2 } }).valid).toBe(false);
  });

  it('rejects slot value 3', () => {
    expect(validateAvailability({ '2026-04-04': { '18': 3 } }).valid).toBe(false);
  });

  it('rejects slot value -1', () => {
    expect(validateAvailability({ '2026-04-04': { '18': -1 } }).valid).toBe(false);
  });

  it('rejects string slot values', () => {
    expect(validateAvailability({ '2026-04-04': { '18': 'available' } }).valid).toBe(false);
  });

  it('accepts empty object', () => {
    expect(validateAvailability({}).valid).toBe(true);
  });

  it('accepts date with empty slots', () => {
    expect(validateAvailability({ '2026-04-04': {} }).valid).toBe(true);
  });
});
