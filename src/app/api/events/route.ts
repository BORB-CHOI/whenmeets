import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, dates, time_start, time_end, password, mode, date_only } = body;

  if (!title || !dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'Title and dates are required' }, { status: 400 });
  }

  if (title.trim().length > 200) {
    return NextResponse.json({ error: 'Title is too long' }, { status: 400 });
  }

  if (dates.length > 60) {
    return NextResponse.json({ error: 'Too many dates (max 60)' }, { status: 400 });
  }

  // Detect days-of-week mode vs calendar mode
  const validDayKeys = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const isDaysOfWeek = dates.every((d: unknown) => typeof d === 'string' && validDayKeys.has(d));
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isCalendar = dates.every((d: unknown) => typeof d === 'string' && dateRegex.test(d));

  if (!isDaysOfWeek && !isCalendar) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Validate calendar dates are real dates (e.g. reject 2026-02-31)
  if (isCalendar) {
    for (const d of dates as string[]) {
      const [y, m, day] = d.split('-').map(Number);
      const parsed = new Date(y, m - 1, day);
      if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== day) {
        return NextResponse.json({ error: `유효하지 않은 날짜: ${d}` }, { status: 400 });
      }
    }
  }

  // Validate time range (15-min slots: 0-96, default 09:00-21:00)
  const start = time_start ?? 36;
  const end = time_end ?? 84;
  if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end > 96 || start >= end) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
  }

  const id = nanoid(10);
  const supabase = createServerClient();

  // Try to get authenticated user (optional — anon creation still works)
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Auth is optional for event creation
  }

  // Validate mode
  const eventMode = mode === 'unavailable' ? 'unavailable' : 'available';
  const isDateOnly = date_only === true;

  const eventData: Record<string, unknown> = {
    id,
    title: title.trim(),
    dates,
    time_start: start,
    time_end: end,
    mode: eventMode,
    date_only: isDateOnly,
  };

  if (userId) {
    eventData.created_by = userId;
  }

  if (password) {
    eventData.password_hash = await bcrypt.hash(password, 10);
  }

  const { error } = await supabase.from('events').insert(eventData);

  if (error) {
    console.error('Event creation failed:', error.message);
    return NextResponse.json({ error: '이벤트 생성에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
