import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whenmeets.com';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from('events')
    .select('title, dates')
    .eq('id', id)
    .single();

  if (!event) {
    return { title: '이벤트를 찾을 수 없습니다 - WhenMeets' };
  }

  const dateCount = event.dates?.length ?? 0;
  const description = `${event.title} — ${dateCount}개 날짜에서 가능한 시간을 골라주세요.`;
  const url = `${SITE_URL}/e/${id}`;

  return {
    title: `${event.title} - WhenMeets`,
    description,
    openGraph: {
      title: `${event.title} - WhenMeets`,
      description,
      url,
      siteName: 'WhenMeets',
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary',
      title: `${event.title} - WhenMeets`,
      description,
    },
  };
}

export default function EventLayout({ children }: Props) {
  return children;
}
