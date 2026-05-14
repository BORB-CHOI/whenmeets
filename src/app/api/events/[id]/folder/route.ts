import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/events/[id]/folder
 *
 * Body: { folder_id: string | null }
 *
 * Moves an owned event to a folder (or null = "No folder").
 * Only the event creator can move it; folder must belong to the same user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const folderId = body?.folder_id;

  if (folderId !== null && (typeof folderId !== 'string' || !UUID_PATTERN.test(folderId))) {
    return NextResponse.json({ error: '잘못된 폴더 ID입니다' }, { status: 400 });
  }

  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Verify ownership of the event
  const { data: event } = await supabase
    .from('events')
    .select('created_by')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!event || event.created_by !== user.id) {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  // If moving to a folder (not null), verify folder ownership
  if (folderId) {
    const { data: folder } = await supabase
      .from('folders')
      .select('user_id')
      .eq('id', folderId)
      .maybeSingle();
    if (!folder || folder.user_id !== user.id) {
      return NextResponse.json({ error: '폴더를 찾을 수 없습니다' }, { status: 404 });
    }
  }

  const { error } = await supabase
    .from('events')
    .update({ folder_id: folderId })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: '이벤트 이동에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
