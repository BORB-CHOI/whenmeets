import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const NO_FOLDER_KEY = '__no_folder__';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OrderEntry {
  key: string;
  position: number;
}

export async function PATCH(request: NextRequest) {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawOrder: unknown = body?.order;
  if (!Array.isArray(rawOrder) || rawOrder.length === 0) {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }

  const entries: OrderEntry[] = [];
  for (const item of rawOrder) {
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }
    const key = (item as { key?: unknown }).key;
    const position = (item as { position?: unknown }).position;
    if (typeof key !== 'string' || typeof position !== 'number' || !Number.isInteger(position)) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
    }
    if (key !== NO_FOLDER_KEY && !UUID_PATTERN.test(key)) {
      return NextResponse.json({ error: '잘못된 ID입니다' }, { status: 400 });
    }
    entries.push({ key, position });
  }

  const folderIds = entries.filter((e) => e.key !== NO_FOLDER_KEY).map((e) => e.key);
  const noFolderEntry = entries.find((e) => e.key === NO_FOLDER_KEY);

  const supabase = createServerClient();

  // Ownership check: every folder ID in the request must belong to the user.
  if (folderIds.length > 0) {
    const { data: owned, error: ownErr } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .in('id', folderIds);
    if (ownErr) {
      return NextResponse.json({ error: '권한 확인에 실패했습니다' }, { status: 500 });
    }
    if ((owned?.length ?? 0) !== folderIds.length) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }
  }

  // Update folder positions sequentially (Supabase JS doesn't expose a single
  // transaction for multiple updates from the API; per-row update is fine for
  // folder counts capped at MAX_FOLDERS_PER_USER = 50).
  for (const entry of entries) {
    if (entry.key === NO_FOLDER_KEY) continue;
    const { error } = await supabase
      .from('folders')
      .update({ position: entry.position })
      .eq('id', entry.key)
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: '폴더 정렬에 실패했습니다' }, { status: 500 });
    }
  }

  if (noFolderEntry) {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, no_folder_position: noFolderEntry.position },
        { onConflict: 'id' },
      );
    if (error) {
      return NextResponse.json({ error: '폴더 정렬에 실패했습니다' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
