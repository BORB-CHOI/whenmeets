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
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: event } = await supabase
    .from('events')
    .select('password_hash')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!event?.password_hash) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, event.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(`whenmeets_auth_${id}`, signEventToken(id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });

  return response;
}
