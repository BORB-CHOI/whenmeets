import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

/**
 * 로그인 사용자의 표시 이름을 변경할 때 호출.
 * - Supabase Auth user_metadata.full_name 변경은 클라이언트에서 직접 수행
 * - 이 엔드포인트는 사용자가 user_id로 참여한 모든 participant 행의 name 컬럼을 동기화
 *
 * 동일 이벤트에서 같은 이름이 이미 다른 참여자에 의해 사용 중이면 충돌이 나는 행은 건너뛰고
 * 가능한 행만 업데이트한다 (best-effort sync).
 */
export async function POST(request: NextRequest) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const name: unknown = body?.name;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const trimmed = name.trim();
  if (trimmed.length > 50) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Find all participant rows owned by this user
  const { data: rows, error: selErr } = await supabase
    .from('participants')
    .select('id, event_id, name')
    .eq('user_id', user.id);

  if (selErr) {
    console.error('sync-name select failed:', selErr.message);
    return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 });
  }

  const targets = (rows ?? []).filter((r) => r.name !== trimmed);
  if (targets.length === 0) {
    return NextResponse.json({ updated: 0, skipped: 0 });
  }

  // Per-row update so unique-name conflicts in a single event are skipped, not aborting the batch
  let updated = 0;
  let skipped = 0;
  for (const row of targets) {
    const { error: updErr } = await supabase
      .from('participants')
      .update({ name: trimmed })
      .eq('id', row.id);
    if (updErr) {
      // 23505 = unique violation (someone else already uses this name in that event)
      if (updErr.code === '23505') {
        skipped++;
        continue;
      }
      console.error('sync-name update failed:', updErr.message);
      return NextResponse.json({ error: 'Failed to sync name' }, { status: 500 });
    }
    updated++;
  }

  return NextResponse.json({ updated, skipped });
}
