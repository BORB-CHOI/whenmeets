'use client';

import { useRouter } from 'next/navigation';

interface EventCardProps {
  id: string;
  title: string;
  dateCount: number;
  participantCount: number;
  createdAt: string;
}

export default function EventCard({
  id,
  title,
  dateCount,
  participantCount,
  createdAt,
}: EventCardProps) {
  const router = useRouter();

  const formattedDate = new Date(createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={() => router.push(`/e/${id}`)}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 min-h-16 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <h3 className="text-base font-semibold text-gray-900 truncate">
        {title}
      </h3>
      <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
        <span>{dateCount}일</span>
        <span className="text-gray-300">|</span>
        <span>{participantCount}명 참여</span>
        <span className="text-gray-300">|</span>
        <span>{formattedDate}</span>
      </div>
    </button>
  );
}
