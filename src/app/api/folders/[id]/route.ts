import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const MAX_NAME_LENGTH = 40;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: '잘못된 ID입니다' }, { status: 400 });
  }

  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!rawName) {
    return NextResponse.json({ error: '폴더 이름을 입력해주세요' }, { status: 400 });
  }
  if (rawName.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: '폴더 이름이 너무 깁니다' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Ownership check
  const { data: existing } = await supabase
    .from('folders')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  const { error } = await supabase
    .from('folders')
    .update({ name: rawName })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 이름의 폴더가 이미 있습니다' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: '폴더 이름 변경에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: '잘못된 ID입니다' }, { status: 400 });
  }

  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from('folders')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  // ON DELETE SET NULL on events.folder_id will move events to "No folder"
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: '폴더 삭제에 실패했습니다' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
