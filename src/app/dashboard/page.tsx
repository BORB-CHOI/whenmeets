import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { createServerClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const metadata = {
  title: '대시보드 - WhenMeets',
};

interface EventListItem {
  id: string;
  title: string;
  dates: string[];
  created_at: string;
  participant_count: number;
}

async function loadDashboardData(userId: string) {
  const supabase = createServerClient();

  const [createdResult, membershipResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, dates, created_at')
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('participants')
      .select('event_id')
      .eq('user_id', userId)
      .limit(50),
  ]);
  const createdRaw = createdResult.data ?? [];
  const participatedEventIds = (membershipResult.data ?? []).map((r) => r.event_id as string);

  let participatedRaw: typeof createdRaw = [];
  if (participatedEventIds.length > 0) {
    const { data } = await supabase
      .from('events')
      .select('id, title, dates, created_at')
      .in('id', participatedEventIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    participatedRaw = data ?? [];
  }

  const allEventIds = Array.from(
    new Set([...createdRaw.map((e) => e.id as string), ...participatedRaw.map((e) => e.id as string)]),
  );
  const countMap: Record<string, number> = {};
  if (allEventIds.length > 0) {
    const { data: counts } = await supabase
      .from('participants')
      .select('event_id')
      .in('event_id', allEventIds);
    for (const c of counts ?? []) {
      const eid = c.event_id as string;
      countMap[eid] = (countMap[eid] || 0) + 1;
    }
  }

  function attachCount(events: typeof createdRaw): EventListItem[] {
    return events.map((e) => ({
      id: e.id as string,
      title: e.title as string,
      dates: e.dates as string[],
      created_at: e.created_at as string,
      participant_count: countMap[e.id as string] || 0,
    }));
  }
  return {
    createdEvents: attachCount(createdRaw),
    participatedEvents: attachCount(participatedRaw),
  };
}

async function DashboardLists({ userId }: { userId: string }) {
  const { createdEvents, participatedEvents } = await loadDashboardData(userId);
  return (
    <DashboardClient
      createdEvents={createdEvents}
      participatedEvents={participatedEvents}
    />
  );
}

function DashboardListsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
        대시보드
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        내 이벤트를 관리하세요.
      </p>
      <div className="mt-8">
        <Suspense fallback={<DashboardListsSkeleton />}>
          <DashboardLists userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}
