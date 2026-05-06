import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';
import EventPageClient from '@/components/event-page/EventPageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  // Kick off auth.getUser in parallel with everything else — its result is only
  // needed for isOwner (after participants resolve), so it's almost free here.
  const authPromise = (async () => {
    try {
      const authClient = await createAuthServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      return user;
    } catch {
      return null;
    }
  })();

  // Fetch event in one query (includes password_hash for auth check)
  const { data: event } = await supabase
    .from('events')
    .select('id, title, dates, time_start, time_end, created_at, password_hash, mode, date_only, description, created_by')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">이벤트를 찾을 수 없습니다</p>
        <Link href="/" className="mt-4 text-teal-600 hover:underline">홈으로</Link>
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

  // If auth required, skip participants/profiles fetch entirely.
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
          is_owner: false,
          participants: [],
        }}
        initialState={{ type: 'password' }}
      />
    );
  }

  // Fetch participants (with user_id for avatar enrichment)
  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, availability, created_at, user_id')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  const userIds = Array.from(
    new Set((participants ?? []).map((r) => r.user_id).filter((v: string | null): v is string => !!v)),
  );

  // Profiles + auth resolve in parallel (auth was kicked off at top of fn).
  const [profilesResult, user] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; avatar_url: string | null }[] }),
    authPromise,
  ]);

  const avatarMap = new Map<string, string | null>();
  for (const p of (profilesResult.data ?? []) as { id: string; avatar_url: string | null }[]) {
    avatarMap.set(p.id, p.avatar_url);
  }
  const enrichedParticipants = (participants ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    availability: p.availability,
    created_at: p.created_at,
    avatar_url: p.user_id ? avatarMap.get(p.user_id) ?? null : null,
  }));

  const isOwner = !!(event.created_by && user?.id === event.created_by);

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
        participants: enrichedParticipants,
        is_owner: isOwner,
      }}
      initialState={{ type: 'ready' }}
    />
  );
}
