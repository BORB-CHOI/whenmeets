import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers/mock-request';

// --- Mock setup (vi.hoisted runs before vi.mock factory) ---
type Row = Record<string, unknown>;
const mockTables = vi.hoisted(() => ({
  events: [] as Row[],
  participants: [] as Row[],
}));

vi.mock('@/lib/supabase/server', () => {
  function makeQueryBuilder(tableName: 'events' | 'participants') {
    let rows: Row[] = [];
    let pendingInsert: Row | null = null;
    let pendingUpdate: Partial<Row> | null = null;
    let selectColumns: string | null = null;
    const filters: Array<{ column: string; value: unknown }> = [];

    function applyFilters() {
      rows = [...mockTables[tableName]];
      for (const f of filters) {
        rows = rows.filter((r) => r[f.column] === f.value);
      }
    }

    function pickColumns(row: Row): Row {
      if (!selectColumns) return { ...row };
      const cols = selectColumns.split(',').map((c) => c.trim());
      const result: Row = {};
      for (const col of cols) {
        if (col in row) result[col] = row[col];
      }
      return result;
    }

    const builder: Record<string, Function> = {
      select(columns?: string) { selectColumns = columns ?? null; return builder; },
      eq(column: string, value: unknown) { filters.push({ column, value }); return builder; },
      order() { return builder; },
      insert(row: Row) {
        // Simulate DB-generated defaults for participants
        if (tableName === 'participants') {
          if (!row.id) row.id = 'gen-p-' + Math.random().toString(36).slice(2, 8);
          if (!row.token) row.token = 'gen-tok-' + Math.random().toString(36).slice(2, 8);
        }
        pendingInsert = { ...row };
        return builder;
      },
      update(values: Partial<Row>) { pendingUpdate = values; return builder; },
      single() {
        if (pendingInsert) {
          mockTables[tableName].push(pendingInsert);
          const result = pickColumns(pendingInsert);
          pendingInsert = null;
          return Promise.resolve({ data: result, error: null });
        }
        if (pendingUpdate) {
          applyFilters();
          if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'Not found' } });
          Object.assign(rows[0], pendingUpdate);
          pendingUpdate = null;
          return Promise.resolve({ data: pickColumns(rows[0]), error: null });
        }
        applyFilters();
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'Not found' } });
        return Promise.resolve({ data: pickColumns(rows[0]), error: null });
      },
      then(resolve: Function) {
        if (pendingInsert) {
          mockTables[tableName].push(pendingInsert);
          resolve({ data: pendingInsert, error: null });
          pendingInsert = null;
          return;
        }
        if (pendingUpdate) {
          applyFilters();
          for (const row of rows) Object.assign(row, pendingUpdate);
          pendingUpdate = null;
          resolve({ data: rows, error: null });
          return;
        }
        applyFilters();
        resolve({ data: rows.map(pickColumns), error: null });
      },
    };
    return builder;
  }

  return {
    createServerClient: () => ({
      from: (table: string) => makeQueryBuilder(table as 'events' | 'participants'),
    }),
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: async (pw: string) => `hashed:${pw}`,
    compare: async (pw: string, hash: string) => hash === `hashed:${pw}`,
  },
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-01',
}));

// --- Import routes after mocks ---
import { POST as createEvent } from '@/app/api/events/route';
import { GET as getEvent } from '@/app/api/events/[id]/route';
import { POST as verifyPassword } from '@/app/api/events/[id]/verify/route';
import { POST as joinEvent } from '@/app/api/events/[id]/participants/route';
import { PATCH as updateAvailability } from '@/app/api/events/[id]/participants/[pid]/route';

function resetTables() {
  mockTables.events = [];
  mockTables.participants = [];
}

// ==========================================
// POST /api/events — Event creation
// ==========================================
describe('POST /api/events', () => {
  beforeEach(resetTables);

  it('creates an event with valid payload', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: {
        title: 'Team Sync',
        dates: ['2026-04-10', '2026-04-11'],
        time_start: 18,
        time_end: 36,
      },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('test-id-01');
    expect(mockTables.events).toHaveLength(1);
    expect(mockTables.events[0].title).toBe('Team Sync');
  });

  it('creates a password-protected event', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: {
        title: 'Secret Meeting',
        dates: ['2026-04-10'],
        password: 'mypass',
      },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(201);
    expect(mockTables.events[0].password_hash).toBe('hashed:mypass');
  });

  it('rejects missing title', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { dates: ['2026-04-10'] },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(400);
  });

  it('rejects empty dates array', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { title: 'Test', dates: [] },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid time range (start >= end)', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: {
        title: 'Test',
        dates: ['2026-04-10'],
        time_start: 40,
        time_end: 20,
      },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(400);
  });

  it('uses default time range when not provided', async () => {
    const req = createMockRequest('/api/events', {
      method: 'POST',
      body: { title: 'Default times', dates: ['2026-04-10'] },
    });
    const res = await createEvent(req);
    expect(res.status).toBe(201);
    expect(mockTables.events[0].time_start).toBe(18);
    expect(mockTables.events[0].time_end).toBe(42);
  });
});

// ==========================================
// GET /api/events/[id] — Fetch event
// ==========================================
describe('GET /api/events/[id]', () => {
  beforeEach(resetTables);

  it('returns event with participants', async () => {
    mockTables.events.push({
      id: 'evt-1',
      title: 'Test Event',
      dates: ['2026-04-10'],
      time_start: 18,
      time_end: 42,
      created_at: '2026-04-04T00:00:00Z',
      password_hash: null,
    });
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      availability: { '2026-04-10': { '18': 2 } },
      created_at: '2026-04-04T01:00:00Z',
    });

    const req = createMockRequest('/api/events/evt-1');
    const res = await getEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe('Test Event');
    expect(json.participants).toHaveLength(1);
    expect(json.participants[0].name).toBe('Alice');
  });

  it('returns 404 for non-existent event', async () => {
    const req = createMockRequest('/api/events/nope');
    const res = await getEvent(req, { params: Promise.resolve({ id: 'nope' }) });
    expect(res.status).toBe(404);
  });

  it('returns requires_auth for password-protected event without cookie', async () => {
    mockTables.events.push({
      id: 'evt-pw',
      title: 'Protected',
      dates: ['2026-04-10'],
      time_start: 18,
      time_end: 42,
      created_at: '2026-04-04T00:00:00Z',
      password_hash: 'hashed:secret',
    });

    const req = createMockRequest('/api/events/evt-pw');
    const res = await getEvent(req, { params: Promise.resolve({ id: 'evt-pw' }) });
    const json = await res.json();
    expect(json.requires_auth).toBe(true);
    expect(json.participants).toBeUndefined();
  });
});

// ==========================================
// POST /api/events/[id]/verify — Password verify
// ==========================================
describe('POST /api/events/[id]/verify', () => {
  beforeEach(resetTables);

  it('sets auth cookie on correct password', async () => {
    mockTables.events.push({
      id: 'evt-pw',
      password_hash: 'hashed:secret',
    });

    const req = createMockRequest('/api/events/evt-pw/verify', {
      method: 'POST',
      body: { password: 'secret' },
    });
    const res = await verifyPassword(req, { params: Promise.resolve({ id: 'evt-pw' }) });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('whenmeets_auth_evt-pw');
  });

  it('rejects wrong password', async () => {
    mockTables.events.push({
      id: 'evt-pw',
      password_hash: 'hashed:secret',
    });

    const req = createMockRequest('/api/events/evt-pw/verify', {
      method: 'POST',
      body: { password: 'wrong' },
    });
    const res = await verifyPassword(req, { params: Promise.resolve({ id: 'evt-pw' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent event', async () => {
    const req = createMockRequest('/api/events/nope/verify', {
      method: 'POST',
      body: { password: 'test' },
    });
    const res = await verifyPassword(req, { params: Promise.resolve({ id: 'nope' }) });
    expect(res.status).toBe(404);
  });
});

// ==========================================
// POST /api/events/[id]/participants — Join event
// ==========================================
describe('POST /api/events/[id]/participants', () => {
  beforeEach(resetTables);

  it('creates a new participant', async () => {
    mockTables.events.push({
      id: 'evt-1',
      password_hash: null,
    });

    const req = createMockRequest('/api/events/evt-1/participants', {
      method: 'POST',
      body: { name: 'Bob' },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBeDefined();
    expect(json.token).toBeDefined();
    expect(json.existing).toBe(false);
  });

  it('rejects empty name', async () => {
    mockTables.events.push({ id: 'evt-1', password_hash: null });

    const req = createMockRequest('/api/events/evt-1/participants', {
      method: 'POST',
      body: { name: '' },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects name > 50 chars', async () => {
    mockTables.events.push({ id: 'evt-1', password_hash: null });

    const req = createMockRequest('/api/events/evt-1/participants', {
      method: 'POST',
      body: { name: 'a'.repeat(51) },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent event', async () => {
    const req = createMockRequest('/api/events/nope/participants', {
      method: 'POST',
      body: { name: 'Test' },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'nope' }) });
    expect(res.status).toBe(404);
  });

  it('returns 409 for duplicate name without matching token', async () => {
    mockTables.events.push({ id: 'evt-1', password_hash: null });
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-alice',
      availability: {},
    });

    const req = createMockRequest('/api/events/evt-1/participants', {
      method: 'POST',
      body: { name: 'Alice' },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(409);
  });

  it('reclaims existing name with valid token', async () => {
    mockTables.events.push({ id: 'evt-1', password_hash: null });
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-alice',
      availability: { '2026-04-10': { '18': 2 } },
    });

    const req = createMockRequest('/api/events/evt-1/participants', {
      method: 'POST',
      body: { name: 'Alice' },
      headers: { 'X-Participant-Token': 'tok-alice' },
    });
    const res = await joinEvent(req, { params: Promise.resolve({ id: 'evt-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.existing).toBe(true);
    expect(json.id).toBe('p-1');
  });
});

// ==========================================
// PATCH /api/events/[id]/participants/[pid] — Update availability
// ==========================================
describe('PATCH /api/events/[id]/participants/[pid]', () => {
  beforeEach(resetTables);

  it('updates availability with valid token', async () => {
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-abc',
      availability: {},
    });

    const newAvailability = { '2026-04-10': { '18': 2, '19': 1 } };
    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: newAvailability },
      headers: { 'X-Participant-Token': 'tok-abc' },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('rejects missing token', async () => {
    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: {} },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects wrong token', async () => {
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-abc',
      availability: {},
    });

    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: {} },
      headers: { 'X-Participant-Token': 'wrong-token' },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects invalid availability format (array)', async () => {
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-abc',
      availability: {},
    });

    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: [1, 2, 3] },
      headers: { 'X-Participant-Token': 'tok-abc' },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid availability value (not 0/1/2)', async () => {
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-abc',
      availability: {},
    });

    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: { '2026-04-10': { '18': 5 } } },
      headers: { 'X-Participant-Token': 'tok-abc' },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(400);
  });

  it('accepts token from body (sendBeacon compatibility)', async () => {
    mockTables.participants.push({
      id: 'p-1',
      event_id: 'evt-1',
      name: 'Alice',
      token: 'tok-abc',
      availability: {},
    });

    const req = createMockRequest('/api/events/evt-1/participants/p-1', {
      method: 'PATCH',
      body: { availability: {}, token: 'tok-abc' },
    });
    const res = await updateAvailability(req, {
      params: Promise.resolve({ id: 'evt-1', pid: 'p-1' }),
    });
    expect(res.status).toBe(200);
  });
});
