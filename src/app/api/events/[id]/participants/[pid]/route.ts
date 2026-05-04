import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await params;
  const body = await request.json();

  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from('participants')
    .select('id, password_hash, user_id')
    .eq('id', pid)
    .eq('event_id', id)
    .single();

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

  // Check event ownership — only the event creator can delete participants
  const { data: event } = await supabase
    .from('events')
    .select('id, created_by, password_hash')
    .eq('id', id)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  let authorized = false;

  // 1. Check if authenticated user is the event creator
  if (event.created_by) {
    try {
      const { createAuthServerClient } = await import('@/lib/supabase/auth-server');
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user?.id === event.created_by) authorized = true;
    } catch { /* no auth */ }
  }

  // 2. For anonymous creators, verify event password via cookie
  if (!authorized && event.password_hash) {
    const { verifyEventToken } = await import('@/lib/auth');
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (cookie && verifyEventToken(id, cookie.value)) {
      authorized = true;
    }
  }

  // 3. If event has no password and no creator, check request body for event password
  if (!authorized && !event.created_by && !event.password_hash) {
    // Open event with no owner — anyone can delete (use with caution)
    // For now, disallow to prevent abuse
    return NextResponse.json({ error: 'Only the event creator can delete participants' }, { status: 403 });
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('id', pid)
    .eq('event_id', id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
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
