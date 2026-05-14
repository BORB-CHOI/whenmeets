import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/events/[id]/folder
 *
 * Body: { folder_id: string | null }
 *
 * Assigns (or unassigns, when folder_id is null) THIS event into a folder
 * that the current user owns. Folder structure is per-user: this only
 * affects how the current user sees the event in their own dashboard.
 * Other users' folder views are unaffected.
 *
 * Authorization: the caller must be able to see the event — i.e. they
 * are the event creator OR a participant. This prevents random event-id
 * discovery via the folder API.
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

  // The event must exist and be visible to the current user.
  // Visible = the user is the creator OR has a participant row.
  const { data: event } = await supabase
    .from('events')
    .select('id, created_by')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 });
  }

  if (event.created_by !== user.id) {
    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!participant) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
  }

  // null = remove the assignment for this user (event drops to "폴더 없음").
  if (folderId === null) {
    const { error } = await supabase
      .from('user_event_folders')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', id);
    if (error) {
      return NextResponse.json({ error: '이벤트 이동에 실패했습니다' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Verify the target folder belongs to the current user.
  const { data: folder } = await supabase
    .from('folders')
    .select('user_id')
    .eq('id', folderId)
    .maybeSingle();
  if (!folder || folder.user_id !== user.id) {
    return NextResponse.json({ error: '폴더를 찾을 수 없습니다' }, { status: 404 });
  }

  const { error } = await supabase
    .from('user_event_folders')
    .upsert(
      {
        user_id: user.id,
        event_id: id,
        folder_id: folderId,
      },
      { onConflict: 'user_id,event_id' },
    );

  if (error) {
    return NextResponse.json({ error: '이벤트 이동에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
