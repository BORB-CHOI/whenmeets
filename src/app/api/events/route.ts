import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

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

  // Validate dates are ISO format strings
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dates.every((d: unknown) => typeof d === 'string' && dateRegex.test(d))) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Validate time range
  const start = time_start ?? 18;
  const end = time_end ?? 42;
  if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end > 48 || start >= end) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
  }

  const id = nanoid(10);
  const supabase = createServerClient();

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

  if (password) {
    eventData.password_hash = await bcrypt.hash(password, 10);
  }

  const { error } = await supabase.from('events').insert(eventData);

  if (error) {
    console.error('Event creation failed:', error.message);
    return NextResponse.json({ error: '일정 생성에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
