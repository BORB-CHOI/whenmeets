import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.trim().length > 50) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, password_hash')
    .eq('id', id)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || !verifyEventToken(id, cookie.value)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  // Use eq instead of ilike to prevent pattern injection (%, _)
  // Case-insensitive matching handled by collation or application logic
  const { data: existing } = await supabase
    .from('participants')
    .select('id, token')
    .eq('event_id', id)
    .eq('name', name.trim())
    .single();

  if (existing) {
    // Name already taken — client must provide their stored token to reclaim.
    // Never return the token here; that would let anyone hijack by guessing a name.
    const clientToken = request.headers.get('X-Participant-Token');
    if (clientToken && safeCompare(clientToken, existing.token)) {
      return NextResponse.json({
        id: existing.id,
        token: existing.token,
        existing: true,
      });
    }
    return NextResponse.json(
      { error: '이미 사용 중인 이름입니다' },
      { status: 409 }
    );
  }

  // Try to get authenticated user (optional)
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Auth is optional for participant creation
  }

  const insertData: Record<string, unknown> = {
    event_id: id,
    name: name.trim(),
    availability: {},
  };
  if (userId) {
    insertData.user_id = userId;
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .insert(insertData)
    .select('id, token')
    .single();

  if (error) {
    // Handle unique constraint violation (race condition: name taken between check and insert)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '이미 사용 중인 이름입니다' },
        { status: 409 }
      );
    }
    console.error('Participant creation failed:', error.message);
    return NextResponse.json({ error: '참여 등록에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({
    id: participant!.id,
    token: participant!.token,
    existing: false,
  }, { status: 201 });
}
