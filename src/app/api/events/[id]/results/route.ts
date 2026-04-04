import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyEventToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Parallel: fetch event and participants at the same time
  const [eventResult, participantsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, dates, time_start, time_end, password_hash')
      .eq('id', id)
      .single(),
    supabase
      .from('participants')
      .select('id, name, availability')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!eventResult.data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const event = eventResult.data;

  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || !verifyEventToken(id, cookie.value)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      dates: event.dates,
      time_start: event.time_start,
      time_end: event.time_end,
    },
    participants: participantsResult.data ?? [],
  });
}
