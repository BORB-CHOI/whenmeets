import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { signEventToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('password_hash')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!event?.password_hash) {
    return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, event.password_hash);
  if (!valid) {
    return NextResponse.json({ error: '비밀번호가 일치하지 않습니다' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`daymeet_auth_${id}`, signEventToken(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });

  return response;
}
