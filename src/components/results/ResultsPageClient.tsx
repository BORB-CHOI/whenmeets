'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Participant } from '@/lib/types';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';
import ParticipantFilter from './ParticipantFilter';
import AdBanner from '@/components/ads/AdBanner';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const HeatmapGrid = dynamic(() => import('./HeatmapGrid'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-xs text-gray-300">로딩 중...</span>
    </div>
  ),
});

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

interface BestTime {
  date: string;
  slot: number;
  count: number;
}

export default function ResultsPageClient({ eventId, initialData }: ResultsPageClientProps) {
  const [data, setData] = useState<ResultsData>(initialData);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialData.participants.map((p) => p.id)),
  );
  const [includeIfNeeded, setIncludeIfNeeded] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Calculate best times
  const bestTimes = useMemo<BestTime[]>(() => {
    const filtered = data.participants.filter((p) => selectedIds.has(p.id));
    if (filtered.length === 0) return [];

    const slots = generateSlots(data.event.time_start, data.event.time_end);
    const results: BestTime[] = [];

    for (const date of data.event.dates) {
      for (const slot of slots) {
        let count = 0;
        for (const p of filtered) {
          const val = p.availability?.[date]?.[String(slot)];
          if (val === 2) count++;
          else if (val === 1 && includeIfNeeded) count++;
        }
        if (count > 0) {
          results.push({ date, slot, count });
        }
      }
    }

    results.sort((a, b) => b.count - a.count);
    return results.slice(0, 5);
  }, [data, selectedIds, includeIfNeeded]);

  // Copy summary to clipboard
  async function handleCopySummary() {
    const filtered = data.participants.filter((p) => selectedIds.has(p.id));
    const lines: string[] = [
      `📅 ${data.event.title}`,
      `참여자: ${filtered.map((p) => p.name).join(', ')} (${filtered.length}명)`,
      '',
    ];

    if (bestTimes.length > 0) {
      lines.push('🏆 베스트 타임:');
      for (const bt of bestTimes) {
        const endSlot = bt.slot + 1;
        lines.push(
          `  ${formatDateCompact(bt.date)} ${slotToTime(bt.slot)}-${slotToTime(endSlot)} — ${bt.count}명 가능`,
        );
      }
    }

    lines.push('', `🔗 ${window.location.origin}/e/${eventId}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">{data.event.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {copied ? '복사됨!' : '스크린샷 복사'}
          </button>
          <Link
            href={`/e/${eventId}`}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            내 시간 수정
          </Link>
        </div>
      </div>

      {data.participants.length === 0 ? (
        <p className="text-gray-400 text-center py-12">아직 응답이 없습니다.</p>
      ) : (
        <>
          <ParticipantFilter
            participants={data.participants}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            onHover={setHoveredId}
            onHoverEnd={() => setHoveredId(null)}
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
              hoveredParticipantId={hoveredId}
            />
          </div>

          {/* Best Times */}
          {bestTimes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">베스트 타임</h2>
              <div className="flex flex-col gap-2">
                {bestTimes.map((bt, i) => {
                  const endSlot = bt.slot + 1;
                  const filtered = data.participants.filter((p) => selectedIds.has(p.id));
                  const total = filtered.length;
                  const ratio = bt.count / total;
                  return (
                    <div
                      key={`${bt.date}-${bt.slot}-${i}`}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${ratio >= 0.75 ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {formatDateCompact(bt.date)} {slotToTime(bt.slot)}-{slotToTime(endSlot)}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${ratio >= 0.75 ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {bt.count}/{total}명
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

      <AdBanner />

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
