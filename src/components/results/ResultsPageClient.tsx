'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Participant } from '@/lib/types';
import HeatmapGrid from './HeatmapGrid';
import ParticipantFilter from './ParticipantFilter';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface ResultsData {
  event: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
  };
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
}

interface ResultsPageClientProps {
  eventId: string;
  initialData: ResultsData;
}

export default function ResultsPageClient({ eventId, initialData }: ResultsPageClientProps) {
  const [data, setData] = useState<ResultsData>(initialData);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialData.participants.map((p) => p.id)),
  );
  const [includeIfNeeded, setIncludeIfNeeded] = useState(true);

  const handleRealtimeUpdate = useCallback(() => {
    fetch(`/api/events/${eventId}/results`)
      .then((res) => res.json())
      .then((d: ResultsData) => {
        setData(d);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          d.participants.forEach((p) => next.add(p.id));
          return next;
        });
      });
  }, [eventId]);

  useRealtimeSync(eventId, true, handleRealtimeUpdate);

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">{data.event.title}</h1>
        <Link
          href={`/e/${eventId}`}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          내 시간 수정
        </Link>
      </div>

      {data.participants.length === 0 ? (
        <p className="text-gray-400 text-center py-12">아직 응답이 없습니다.</p>
      ) : (
        <>
          <ParticipantFilter
            participants={data.participants}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
          />

          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={includeIfNeeded}
                onChange={(e) => setIncludeIfNeeded(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              &quot;되면 가능&quot; 포함
            </label>
          </div>

          <div className="mt-4">
            <HeatmapGrid
              dates={data.event.dates}
              timeStart={data.event.time_start}
              timeEnd={data.event.time_end}
              participants={data.participants}
              selectedIds={selectedIds}
              includeIfNeeded={includeIfNeeded}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />
              <span>0명</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-200" />
              <span>일부</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-500" />
              <span>전원</span>
            </div>
          </div>
        </>
      )}

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">이 일정을 공유하세요:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? `${window.location.origin}/e/${eventId}` : ''}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          />
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/e/${eventId}`)}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            복사
          </button>
        </div>
      </div>
    </div>
  );
}
