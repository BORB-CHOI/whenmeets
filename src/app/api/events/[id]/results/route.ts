import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyEventToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch event first (includes password_hash for auth check)
  const { data: event } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, mode, password_hash')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Auth check BEFORE fetching participants
  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || !verifyEventToken(id, cookie.value)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  // Only fetch participants after auth passes
  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability, user_id')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  const enriched = await attachAvatars(supabase, participants ?? []);

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      dates: event.dates,
      time_start: event.time_start,
      time_end: event.time_end,
      mode: event.mode,
    },
    participants: enriched,
  });
}

interface ParticipantRow {
  id: string;
  name: string;
  availability: unknown;
  user_id: string | null;
}

async function attachAvatars(
  supabase: ReturnType<typeof createServerClient>,
  rows: ParticipantRow[],
): Promise<Array<ParticipantRow & { avatar_url: string | null }>> {
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)),
  );
  if (userIds.length === 0) {
    return rows.map((r) => ({ ...r, avatar_url: null }));
  }
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', userIds);
  const avatarMap = new Map<string, string | null>(
    (profiles ?? []).map((p: { id: string; avatar_url: string | null }) => [p.id, p.avatar_url]),
  );
  return rows.map((r) => ({
    ...r,
    avatar_url: r.user_id ? avatarMap.get(r.user_id) ?? null : null,
  }));
}
