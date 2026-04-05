'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Availability, AvailabilityLevel, EventMode, Participant } from '@/lib/types';
import DragGrid from '@/components/drag-grid/DragGrid';
import CalendarImportButton from './CalendarImportButton';


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
  mode = 'available',
}: GridEditorProps) {
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(mode === 'unavailable' ? 0 : 2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-xs text-gray-400">
            {saving ? '저장 중...' : '자동 저장됨'}
          </p>
        </div>
        <Link
          href={`/e/${eventId}/results`}
          className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          결과 보기
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3">
        <CalendarImportButton
          dates={dates}
          timeStart={timeStart}
          timeEnd={timeEnd}
          onImport={onAvailabilityChange}
        />
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
        eventMode={mode}
        activeMode={activeMode}
        onActiveModeChange={setActiveMode}
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
