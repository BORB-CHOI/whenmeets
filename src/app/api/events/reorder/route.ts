import { withApiHandler } from '@/server/http/api-handler';
import { ok } from '@/server/http/response';
import { getAuthContext } from '@/server/http/auth-context';
import { eventReorderService } from '@/server/services/folders.service';
import { reorderEventsSchema } from '@/server/validators/folder.schema';
import type { z } from 'zod';

type Body = z.infer<typeof reorderEventsSchema>;

export const PATCH = withApiHandler<unknown, Body>(
  { bodySchema: reorderEventsSchema },
  async ({ req, body }) => {
    const auth = await getAuthContext(req);
    await eventReorderService.reorder(auth, body.updates);
    return ok({ ok: true });
  },
);

/* === Legacy implementation kept inline until removed in next commit ===
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_UPDATES = 500;

interface UpdateEntry {
  event_id: string;
  folder_id: string | null;
  position: number;
}

async function _legacyPATCH(request: NextRequest) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawUpdates: unknown = body?.updates;
  if (!Array.isArray(rawUpdates) || rawUpdates.length === 0) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }
  if (rawUpdates.length > MAX_UPDATES) {
    return NextResponse.json({ error: '한 번에 변경 가능한 이벤트 수를 초과했습니다' }, { status: 400 });
  }

  const updates: UpdateEntry[] = [];
  for (const item of rawUpdates) {
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }
    const r = item as Record<string, unknown>;
    if (typeof r.event_id !== 'string' || !r.event_id) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }
    if (typeof r.position !== 'number' || !Number.isInteger(r.position)) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }
    const folder_id = r.folder_id;
    if (folder_id !== null && (typeof folder_id !== 'string' || !UUID_PATTERN.test(folder_id))) {
      return NextResponse.json({ error: '잘못된 폴더 ID입니다' }, { status: 400 });
    }
    updates.push({
      event_id: r.event_id,
      folder_id: folder_id as string | null,
      position: r.position,
    });
  }

  const supabase = createServerClient();

  const eventIds = Array.from(new Set(updates.map((u) => u.event_id)));

  // Visibility check: caller must be the creator OR a participant for every event.
  const [{ data: created }, { data: parts }] = await Promise.all([
    supabase
      .from('events')
      .select('id')
      .eq('created_by', user.id)
      .in('id', eventIds)
      .is('deleted_at', null),
    supabase
      .from('participants')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', eventIds),
  ]);
  const visible = new Set<string>([
    ...(created ?? []).map((r) => r.id as string),
    ...(parts ?? []).map((r) => r.event_id as string),
  ]);
  for (const id of eventIds) {
    if (!visible.has(id)) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
  }

  // Folder ownership check for any non-null folder_id values.
  const folderIds = Array.from(
    new Set(updates.map((u) => u.folder_id).filter((id): id is string => id !== null)),
  );
  if (folderIds.length > 0) {
    const { data: owned } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .in('id', folderIds);
    const ownedSet = new Set((owned ?? []).map((r) => r.id as string));
    for (const fid of folderIds) {
      if (!ownedSet.has(fid)) {
        return NextResponse.json({ error: '폴더 권한이 없습니다' }, { status: 403 });
      }
    }
  }

  // Update user_event_folders: upsert when folder_id is non-null, delete when null.
  const folderUpserts = updates
    .filter((u) => u.folder_id !== null)
    .map((u) => ({
      user_id: user.id,
      event_id: u.event_id,
      folder_id: u.folder_id as string,
    }));
  if (folderUpserts.length > 0) {
    const { error } = await supabase
      .from('user_event_folders')
      .upsert(folderUpserts, { onConflict: 'user_id,event_id' });
    if (error) {
      return NextResponse.json({ error: '폴더 배정에 실패했습니다' }, { status: 500 });
    }
  }
  const folderDeletes = updates.filter((u) => u.folder_id === null).map((u) => u.event_id);
  if (folderDeletes.length > 0) {
    const { error } = await supabase
      .from('user_event_folders')
      .delete()
      .eq('user_id', user.id)
      .in('event_id', folderDeletes);
    if (error) {
      return NextResponse.json({ error: '폴더 배정 해제에 실패했습니다' }, { status: 500 });
    }
  }

  // Update user_event_order positions.
  const orderUpserts = updates.map((u) => ({
    user_id: user.id,
    event_id: u.event_id,
    position: u.position,
  }));
  const { error: orderErr } = await supabase
    .from('user_event_order')
    .upsert(orderUpserts, { onConflict: 'user_id,event_id' });
  if (orderErr) {
    return NextResponse.json({ error: '순서 저장에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
=== End legacy ===*/
