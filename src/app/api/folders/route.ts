import { withApiHandler } from '@/server/http/api-handler';
import { ok, created } from '@/server/http/response';
import { getAuthContext } from '@/server/http/auth-context';
import { foldersService } from '@/server/services/folders.service';
import { folderNameSchema } from '@/server/validators/folder.schema';
import type { z } from 'zod';

type CreateBody = z.infer<typeof folderNameSchema>;

export const GET = withApiHandler<unknown, unknown>(
  {},
  async ({ req }) => {
    const auth = await getAuthContext(req);
    const result = await foldersService.list(auth);
    return ok(result);
  },
);

export const POST = withApiHandler<unknown, CreateBody>(
  { bodySchema: folderNameSchema },
  async ({ req, body }) => {
    const auth = await getAuthContext(req);
    const result = await foldersService.create(auth, body.name);
    return created(result);
  },
);

/* === Legacy implementation kept inline until removed in next commit ===
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const MAX_FOLDERS_PER_USER = 50;
const MAX_NAME_LENGTH = 40;

async function _legacyGET() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('folders')
    .select('id, name, position, created_at')
    .eq('user_id', user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: '폴더를 불러오지 못했습니다' }, { status: 500 });
  }
  return NextResponse.json({ folders: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  const { count } = await supabase
    .from('folders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if ((count ?? 0) >= MAX_FOLDERS_PER_USER) {
    return NextResponse.json(
      { error: '폴더 개수 한도를 초과했습니다' },
      { status: 409 },
    );
  }

  const { data: maxRow } = await supabase
    .from('folders')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from('folders')
    .insert({
      user_id: user.id,
      name: rawName,
      position: nextPosition,
    })
    .select('id, name, position, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '같은 이름의 폴더가 이미 있습니다' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: '폴더 생성에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({ folder: data }, { status: 201 });
}
=== End legacy ===*/
