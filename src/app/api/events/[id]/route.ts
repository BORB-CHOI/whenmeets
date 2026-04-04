import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
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
    .select('id, title, dates, time_start, time_end, created_at, password_hash, mode, date_only, description')
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
    mode: event.mode,
    date_only: event.date_only,
    description: event.description ?? undefined,
    participants: participants ?? [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.dates !== undefined) updateData.dates = body.dates;
  if (body.time_start !== undefined) updateData.time_start = body.time_start;
  if (body.time_end !== undefined) updateData.time_end = body.time_end;
  if (body.mode !== undefined) updateData.mode = body.mode;
  if (body.date_only !== undefined) updateData.date_only = body.date_only;
  if (body.description !== undefined) updateData.description = body.description;

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Soft delete: set deleted_at timestamp (only by event creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verify the user owns this event
  const { data: event } = await supabase
    .from('events')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!event || event.created_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft delete: set deleted_at
  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
