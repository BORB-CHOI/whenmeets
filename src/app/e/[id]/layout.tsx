import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://daymeet.org';

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
    return { title: '이벤트를 찾을 수 없습니다 - DayMeet' };
  }

  const dateCount = event.dates?.length ?? 0;
  const description = `${event.title} — ${dateCount}개 날짜에서 가능한 시간을 골라주세요.`;
  const url = `${SITE_URL}/e/${id}`;

  return {
    title: `${event.title} - DayMeet`,
    description,
    openGraph: {
      title: `${event.title} - DayMeet`,
      description,
      url,
      siteName: 'DayMeet',
      type: 'website',
      locale: 'ko_KR',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'DayMeet - 쉽고 빠른 그룹 일정 조율',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} - DayMeet`,
      description,
      images: ['/twitter-image'],
    },
  };
}

export default function EventLayout({ children }: Props) {
  return children;
}
