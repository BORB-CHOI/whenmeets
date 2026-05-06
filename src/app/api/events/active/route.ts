import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  let ids: unknown;
  try {
    ({ ids } = await request.json());
  } catch {
    return NextResponse.json({ activeIds: [] });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ activeIds: [] });
  }
  const stringIds = ids.filter((v): v is string => typeof v === 'string').slice(0, 100);
  if (stringIds.length === 0) {
    return NextResponse.json({ activeIds: [] });
  }
  const supabase = createServerClient();
  const { data } = await supabase
    .from('events')
    .select('id')
    .in('id', stringIds)
    .is('deleted_at', null);
  return NextResponse.json({ activeIds: (data ?? []).map((e) => e.id as string) });
}
