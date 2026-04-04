import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyEventToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Single query: fetch event with password_hash included (strip from response)
  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, created_at, password_hash')
    .eq('id', id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const hasPassword = !!event.password_hash;
  if (hasPassword) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || !verifyEventToken(id, cookie.value)) {
      return NextResponse.json({
        id: event.id,
        title: event.title,
        has_password: true,
        requires_auth: true,
      });
    }
  }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    id: event.id,
    title: event.title,
    dates: event.dates,
    time_start: event.time_start,
    time_end: event.time_end,
    has_password: hasPassword,
    created_at: event.created_at,
    participants: participants ?? [],
  });
}
