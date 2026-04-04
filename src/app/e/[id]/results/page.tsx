import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { verifyEventToken } from '@/lib/auth';
import ResultsPageClient from '@/components/results/ResultsPageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerClient();

  // Parallel fetch: event + participants
  const [eventResult, participantsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, dates, time_start, time_end, password_hash')
      .eq('id', id)
      .single(),
    supabase
      .from('participants')
      .select('id, name, availability')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!eventResult.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">결과를 불러올 수 없습니다</p>
        <Link href="/" className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          홈으로
        </Link>
      </div>
    );
  }

  const event = eventResult.data;

  // Check password auth if needed
  if (event.password_hash) {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`whenmeets_auth_${id}`);
    if (!authCookie || !verifyEventToken(id, authCookie.value)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <p className="text-gray-500">인증이 필요합니다</p>
          <Link href={`/e/${id}`} className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            이벤트로 돌아가기
          </Link>
        </div>
      );
    }
  }

  return (
    <ResultsPageClient
      eventId={id}
      initialData={{
        event: {
          id: event.id,
          title: event.title,
          dates: event.dates,
          time_start: event.time_start,
          time_end: event.time_end,
        },
        participants: participantsResult.data ?? [],
      }}
    />
  );
}
