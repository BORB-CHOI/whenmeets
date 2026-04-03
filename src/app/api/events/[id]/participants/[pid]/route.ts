import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  const { id, pid } = await params;
  const token = request.headers.get('X-Participant-Token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from('participants')
    .select('id, token')
    .eq('id', pid)
    .eq('event_id', id)
    .single();

  if (!participant || !safeCompare(participant.token, token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { availability } = await request.json();

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
