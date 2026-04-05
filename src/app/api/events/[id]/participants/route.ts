import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';

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

  // Check for existing participant with same name
  const { data: existing } = await supabase
    .from('participants')
    .select('id, name, password_hash')
    .eq('event_id', id)
    .eq('name', trimmedName)
    .single();

  if (existing) {
    if (existing.password_hash) {
      // Has password — verify it
      if (password && await bcrypt.compare(password, existing.password_hash)) {
        return NextResponse.json({
          id: existing.id,
          name: existing.name,
          existing: true,
        });
      }
      // Wrong or missing password — auto-number the new name
      const escapedName = trimmedName.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data: similar } = await supabase
        .from('participants')
        .select('name')
        .eq('event_id', id)
        .like('name', `${escapedName}-%`);

      let nextNum = 2;
      if (similar && similar.length > 0) {
        for (const p of similar) {
          const suffix = p.name.replace(`${trimmedName}-`, '');
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num >= nextNum) {
            nextNum = num + 1;
          }
        }
      }

      const numberedName = `${trimmedName}-${nextNum}`;
      const insertData: Record<string, unknown> = {
        event_id: id,
        name: numberedName,
        availability: {},
        password_hash: password ? await bcrypt.hash(password, 10) : null,
      };

      // Try to get authenticated user (optional)
      let userId: string | null = null;
      try {
        const authClient = await createAuthServerClient();
        const { data: { user } } = await authClient.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        // Auth is optional
      }
      if (userId) insertData.user_id = userId;

      const { data: participant, error } = await supabase
        .from('participants')
        .insert(insertData)
        .select('id, name')
        .single();

      if (error) {
        console.error('Participant creation failed:', error.message);
        return NextResponse.json({ error: '참여 등록에 실패했습니다' }, { status: 500 });
      }

      return NextResponse.json({
        id: participant!.id,
        name: participant!.name,
        existing: false,
        numbered: true,
      }, { status: 201 });
    }

    // No password — anyone can access
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      existing: true,
    });
  }

  // New participant
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Auth is optional for participant creation
  }

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
