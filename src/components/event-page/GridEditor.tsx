'use client';

import Link from 'next/link';
import { Availability, EventMode, Participant } from '@/lib/types';
import DragGrid from '@/components/drag-grid/DragGrid';

interface GridEditorProps {
  eventId: string;
  title: string;
  dates: string[];
  timeStart: number;
  timeEnd: number;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  saving: boolean;
  participants?: Pick<Participant, 'id' | 'name' | 'availability'>[];
  currentParticipantId?: string | null;
  dateOnly?: boolean;
  mode?: EventMode;
}

export default function GridEditor({
  eventId,
  title,
  dates,
  timeStart,
  timeEnd,
  availability,
  onAvailabilityChange,
  saving,
  participants,
  currentParticipantId,
  dateOnly,
}: GridEditorProps) {
  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-xs text-gray-400">
            {saving ? '저장 중...' : '자동 저장됨'}
          </p>
        </div>
        <Link
          href={`/e/${eventId}/results`}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          결과 보기
        </Link>
      </div>

      <DragGrid
        dates={dates}
        timeStart={timeStart}
        timeEnd={timeEnd}
        availability={availability}
        onAvailabilityChange={onAvailabilityChange}
        participants={participants}
        currentParticipantId={currentParticipantId}
        dateOnly={dateOnly}
      />

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">이 링크를 공유하세요:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          />
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            복사
          </button>
        </div>
      </div>
    </div>
  );
}
