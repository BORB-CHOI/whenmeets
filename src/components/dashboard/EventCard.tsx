'use client';

import { useRouter } from 'next/navigation';
import InlineDeleteButton from '@/components/ui/InlineDeleteButton';

interface EventCardProps {
  id: string;
  title: string;
  dateCount: number;
  participantCount: number;
  createdAt: string;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export default function EventCard({
  id,
  title,
  dateCount,
  participantCount,
  createdAt,
  canDelete,
  onDelete,
}: EventCardProps) {
  const router = useRouter();

  const formattedDate = new Date(createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="group relative w-full bg-white border border-gray-200 rounded-lg p-4 min-h-16 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all">
      <button
        onClick={() => router.push(`/e/${id}`)}
        className="w-full text-left cursor-pointer"
      >
        <h3 className="text-base font-semibold text-gray-900 truncate pr-8">
          {title}
        </h3>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {dateCount}일
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {participantCount}명
          </span>
          <span className="text-gray-300">|</span>
          <span>{formattedDate}</span>
        </div>
      </button>

      {/* Delete button */}
      {canDelete && (
        <div className="absolute top-3 right-3">
          <InlineDeleteButton
            onConfirm={() => onDelete?.(id)}
            title="이벤트 삭제"
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
      )}
    </div>
  );
}
