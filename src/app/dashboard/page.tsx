import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { createServerClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const metadata = {
  title: '대시보드 — WhenMeets',
};

export default async function DashboardPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const supabase = createServerClient();

  // Fetch events created by this user (limit to prevent unbounded queries)
  const { data: createdRaw } = await supabase
    .from('events')
    .select('id, title, dates, created_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch events where user is a participant
  const { data: participantRows } = await supabase
    .from('participants')
    .select('event_id')
    .eq('user_id', user.id)
    .limit(50);

  const participatedEventIds = (participantRows ?? []).map(
    (r) => r.event_id as string,
  );

  let participatedRaw: typeof createdRaw = [];
  if (participatedEventIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select('id, title, dates, created_at')
      .in('id', participatedEventIds)
      .order('created_at', { ascending: false })
      .limit(50);
    participatedRaw = data;
  }

  // For each event, get participant count
  async function withParticipantCount(
    events: typeof createdRaw,
  ) {
    if (!events || events.length === 0) return [];
    const ids = events.map((e) => e.id);
    const { data: counts } = await supabase
      .from('participants')
      .select('event_id')
      .in('event_id', ids);

    const countMap: Record<string, number> = {};
    (counts ?? []).forEach((c) => {
      const eid = c.event_id as string;
      countMap[eid] = (countMap[eid] || 0) + 1;
    });

    return events.map((e) => ({
      id: e.id as string,
      title: e.title as string,
      dates: e.dates as string[],
      created_at: e.created_at as string,
      participant_count: countMap[e.id] || 0,
    }));
  }

  const [createdEvents, participatedEvents] = await Promise.all([
    withParticipantCount(createdRaw),
    withParticipantCount(participatedRaw),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
        대시보드
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        내 일정을 관리하세요.
      </p>
      <div className="mt-8">
        <DashboardClient
          createdEvents={createdEvents}
          participatedEvents={participatedEvents}
        />
      </div>
    </div>
  );
}
