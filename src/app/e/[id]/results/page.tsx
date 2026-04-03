'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Participant } from '@/lib/types';
import HeatmapGrid from '@/components/results/HeatmapGrid';
import ParticipantFilter from '@/components/results/ParticipantFilter';
import { createBrowserClient } from '@/lib/supabase/client';

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

export default function ResultsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeIfNeeded, setIncludeIfNeeded] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/events/${eventId}/results`);
      if (!res.ok) {
        setError('결과를 불러올 수 없습니다');
        return;
      }
      const d: ResultsData = await res.json();
      setData(d);
      setSelectedIds(new Set(d.participants.map((p) => p.id)));
    }
    load();
  }, [eventId]);

  // Realtime subscription (depends only on eventId to avoid infinite re-subscribe)
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (data && !loaded) setLoaded(true);
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`results-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loaded, eventId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

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
                className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
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
              <div className="w-3 h-3 rounded bg-emerald-200" />
              <span>일부</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
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
