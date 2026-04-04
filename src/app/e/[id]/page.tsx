import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { verifyEventToken } from '@/lib/auth';
import EventPageClient from '@/components/event-page/EventPageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch event in one query (includes password_hash for auth check)
  const { data: event } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, created_at, password_hash, mode, date_only, description')
    .eq('id', id)
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">이벤트를 찾을 수 없습니다</p>
        <Link href="/" className="mt-4 text-indigo-600 hover:underline">홈으로</Link>
      </div>
    );
  }

  const hasPassword = !!event.password_hash;
  let requiresAuth = false;

  if (hasPassword) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`whenmeets_auth_${id}`);
    if (!authCookie || !verifyEventToken(id, authCookie.value)) {
      requiresAuth = true;
    }
  }

  // If auth required, pass minimal data (don't load participants yet)
  if (requiresAuth) {
    return (
      <EventPageClient
        eventId={id}
        initialEvent={{
          id: event.id,
          title: event.title,
          dates: event.dates,
          time_start: event.time_start,
          time_end: event.time_end,
          has_password: true,
          created_at: event.created_at,
          mode: event.mode ?? 'available',
          date_only: event.date_only ?? false,
          description: event.description ?? undefined,
          requires_auth: true,
          participants: [],
        }}
        initialState={{ type: 'password' }}
      />
    );
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  return (
    <EventPageClient
      eventId={id}
      initialEvent={{
        id: event.id,
        title: event.title,
        dates: event.dates,
        time_start: event.time_start,
        time_end: event.time_end,
        has_password: hasPassword,
        created_at: event.created_at,
        mode: event.mode ?? 'available',
        date_only: event.date_only ?? false,
        description: event.description ?? undefined,
        participants: participants ?? [],
      }}
      initialState={{ type: 'ready' }}
    />
  );
}
