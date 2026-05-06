import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const MAX_NAME_LENGTH = 50;

export async function GET() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('profile GET failed:', error.message);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      id: user.id,
      display_name: null,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const rawName: unknown = body?.display_name;
  if (typeof rawName !== 'string' || !rawName.trim()) {
    return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 });
  }
  const trimmed = rawName.trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: '이름이 너무 깁니다' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: updated, error: upsertErr } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, display_name: trimmed },
      { onConflict: 'id' },
    )
    .select('id, display_name, avatar_url')
    .single();

  if (upsertErr) {
    console.error('profile PATCH failed:', upsertErr.message);
    return NextResponse.json({ error: '프로필 저장에 실패했습니다' }, { status: 500 });
  }

  let participantSync: { updated: number; skipped: number } | null = null;
  try {
    const { data: rows } = await supabase
      .from('participants')
      .select('id, name')
      .eq('user_id', user.id);

    const targets = (rows ?? []).filter((r) => r.name !== trimmed);
    let participantsUpdated = 0;
    let participantsSkipped = 0;
    for (const row of targets) {
      const { error: rowErr } = await supabase
        .from('participants')
        .update({ name: trimmed })
        .eq('id', row.id);
      if (rowErr) {
        if (rowErr.code === '23505') {
          participantsSkipped++;
          continue;
        }
        console.error('participants sync failed:', rowErr.message);
        break;
      }
      participantsUpdated++;
    }
    participantSync = { updated: participantsUpdated, skipped: participantsSkipped };
  } catch (e) {
    console.error('participants sync exception:', e);
  }

  return NextResponse.json({
    profile: updated,
    participants: participantSync,
  });
}
