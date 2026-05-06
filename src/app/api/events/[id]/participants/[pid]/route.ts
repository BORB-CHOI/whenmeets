import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await params;
  const body = await request.json();

  const supabase = createServerClient();

  // Fetch event (deleted-aware) and participant in parallel — if event is
  // soft-deleted, bail before any auth/bcrypt work.
  const [eventCheck, participantQuery] = await Promise.all([
    supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('participants')
      .select('id, password_hash, user_id')
      .eq('id', pid)
      .eq('event_id', id)
      .single(),
  ]);

  if (!eventCheck.data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const participant = participantQuery.data;
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Ownership check: a participant bound to a logged-in user can only be
  // edited by that same user. This prevents a different account (or a stale
  // localStorage session) from editing someone else's schedule by knowing pid.
  if (participant.user_id) {
    let currentUserId: string | null = null;
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      currentUserId = user?.id ?? null;
    } catch {
      // ignore
    }
    if (currentUserId !== participant.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  } else if (participant.password_hash) {
    // Anonymous-with-password slot: verify password
    const { password } = body;
    if (!password || !(await bcrypt.compare(password, participant.password_hash))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  // Anonymous-no-password slot: shared-edit (legacy behavior)

  const { availability } = body;

  // Validate availability shape: Record<string, Record<string, 0|1|2>>
  if (typeof availability !== 'object' || availability === null || Array.isArray(availability)) {
    return NextResponse.json({ error: 'Invalid availability format' }, { status: 400 });
  }

  // Size limits to prevent abuse
  const dateKeys = Object.keys(availability);
  if (dateKeys.length > 60) {
    return NextResponse.json({ error: 'Too many dates in availability' }, { status: 400 });
  }
  for (const [dateKey, slots] of Object.entries(availability)) {
    if (typeof dateKey !== 'string' || typeof slots !== 'object' || slots === null || Array.isArray(slots)) {
      return NextResponse.json({ error: 'Invalid availability format' }, { status: 400 });
    }
    for (const val of Object.values(slots as Record<string, unknown>)) {
      if (val !== 0 && val !== 1 && val !== 2) {
        return NextResponse.json({ error: 'Invalid availability value' }, { status: 400 });
      }
    }
  }

  const { error } = await supabase
    .from('participants')
    .update({ availability })
    .eq('id', pid);

  if (error) {
    console.error('Availability update failed:', error.message);
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, created_by, password_hash')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id, user_id, password_hash')
    .eq('id', pid)
    .eq('event_id', id)
    .single();
  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  let currentUserId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch { /* ignore */ }

  let bodyPassword: string | undefined;
  async function readBodyPassword(): Promise<string | undefined> {
    if (bodyPassword !== undefined) return bodyPassword;
    try {
      const body = await request.json();
      bodyPassword = typeof body?.password === 'string' ? body.password : '';
    } catch {
      bodyPassword = '';
    }
    return bodyPassword;
  }

  let authorized = false;

  if (participant.user_id) {
    if (currentUserId === participant.user_id) authorized = true;
  } else if (participant.password_hash) {
    const pw = await readBodyPassword();
    if (pw && (await bcrypt.compare(pw, participant.password_hash))) {
      authorized = true;
    }
  } else {
    authorized = true;
  }

  if (!authorized && event.created_by && currentUserId === event.created_by) {
    authorized = true;
  }

  if (!authorized && event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (cookie && verifyEventToken(id, cookie.value)) {
      authorized = true;
    }
  }

  if (!authorized) {
    if (!participant.user_id && participant.password_hash) {
      return NextResponse.json({ error: 'Password required', requires_password: true }, { status: 401 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', pid)
    .eq('event_id', id);

  if (error) {
    return NextResponse.json({ error: '삭제에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// sendBeacon always sends POST — delegate to PATCH logic
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> }
) {
  return PATCH(request, context);
}
