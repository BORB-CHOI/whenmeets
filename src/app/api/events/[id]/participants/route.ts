import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';

// Insert a new participant, falling back to "Name (2)", "Name (3)", ... on
// unique-name conflicts. Used when a logged-in user's display name collides
// with another participant they don't own — we never let them take over an
// existing slot they didn't create.
async function insertWithNumberedName(
  supabase: ReturnType<typeof createServerClient>,
  baseInsert: Record<string, unknown>,
  baseName: string,
): Promise<{ id: string; name: string } | { error: string; status: number }> {
  for (let suffix = 2; suffix <= 50; suffix++) {
    const candidate = `${baseName} (${suffix})`;
    const { data, error } = await supabase
      .from('participants')
      .insert({ ...baseInsert, name: candidate })
      .select('id, name')
      .single();
    if (!error) return { id: data!.id, name: data!.name };
    if (error.code !== '23505') {
      console.error('Numbered insert failed:', error.message);
      return { error: '참여 등록에 실패했습니다', status: 500 };
    }
    // 23505 = unique violation, try next suffix
  }
  return { error: '이름이 너무 많이 중복됩니다', status: 409 };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, password } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 50) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, password_hash')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (event.password_hash) {
    const cookie = request.cookies.get(`whenmeets_auth_${id}`);
    if (!cookie || !verifyEventToken(id, cookie.value)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  // Resolve current user (optional)
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Auth is optional for participant creation
  }

  // Logged-in user: ALWAYS bind to their own (user_id, event_id) row first.
  // This prevents take-over of an anonymous participant by changing display name.
  if (userId) {
    const { data: ownExisting } = await supabase
      .from('participants')
      .select('id, name')
      .eq('event_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (ownExisting) {
      return NextResponse.json({
        id: ownExisting.id,
        name: ownExisting.name,
        existing: true,
      });
    }
  }

  // Look up an existing participant with the same name (case-insensitive)
  const { data: existingByName } = await supabase
    .from('participants')
    .select('id, name, password_hash, user_id')
    .eq('event_id', id)
    .ilike('name', trimmedName)
    .maybeSingle();

  if (existingByName) {
    // Logged-in user trying to use a name owned by someone else (or by an
    // anonymous slot they didn't create) — never take over, create a
    // numbered-name participant instead.
    if (userId) {
      const inserted = await insertWithNumberedName(
        supabase,
        {
          event_id: id,
          availability: {},
          password_hash: null,
          user_id: userId,
        },
        trimmedName,
      );
      if ('error' in inserted) {
        return NextResponse.json({ error: inserted.error }, { status: inserted.status });
      }
      return NextResponse.json({
        id: inserted.id,
        name: inserted.name,
        existing: false,
        numbered: true,
      }, { status: 201 });
    }

    // Anonymous request — the existing slot was created by a logged-in user;
    // anonymous users cannot take it over either.
    if (existingByName.user_id) {
      return NextResponse.json(
        { error: '이미 사용 중인 이름입니다' },
        { status: 409 },
      );
    }

    // Anonymous-with-password slot: verify password to access
    if (existingByName.password_hash) {
      if (password && await bcrypt.compare(password, existingByName.password_hash)) {
        return NextResponse.json({
          id: existingByName.id,
          name: existingByName.name,
          existing: true,
        });
      }
      return NextResponse.json(
        { error: '비밀번호가 필요합니다', requires_password: true },
        { status: 401 },
      );
    }

    // Anonymous-no-password slot taken by anonymous request — backwards-compatible
    // shared edit (the original behavior). To opt out, the original creator
    // should set a password.
    return NextResponse.json({
      id: existingByName.id,
      name: existingByName.name,
      existing: true,
    });
  }

  // New participant, no name collision
  const insertData: Record<string, unknown> = {
    event_id: id,
    name: trimmedName,
    availability: {},
    password_hash: password ? await bcrypt.hash(password, 10) : null,
  };
  if (userId) {
    insertData.user_id = userId;
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .insert(insertData)
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Race: someone created a row with this name between our SELECT and INSERT.
      // Fall back to numbered name for logged-in users; reject for anonymous.
      if (userId) {
        const inserted = await insertWithNumberedName(
          supabase,
          {
            event_id: id,
            availability: {},
            password_hash: null,
            user_id: userId,
          },
          trimmedName,
        );
        if ('error' in inserted) {
          return NextResponse.json({ error: inserted.error }, { status: inserted.status });
        }
        return NextResponse.json({
          id: inserted.id,
          name: inserted.name,
          existing: false,
          numbered: true,
        }, { status: 201 });
      }
      return NextResponse.json(
        { error: '이미 사용 중인 이름입니다' },
        { status: 409 }
      );
    }
    console.error('Participant creation failed:', error.message);
    return NextResponse.json({ error: '참여 등록에 실패했습니다' }, { status: 500 });
  }

  return NextResponse.json({
    id: participant!.id,
    name: participant!.name,
    existing: false,
  }, { status: 201 });
}
