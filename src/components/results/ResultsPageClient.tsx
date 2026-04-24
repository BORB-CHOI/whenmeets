'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { EventMode, Participant } from '@/lib/types';
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
    mode?: EventMode;
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

    const isUnavailableMode = data.event.mode === 'unavailable';
    for (const date of data.event.dates) {
      for (const slot of slots) {
        let count = 0;
        for (const p of filtered) {
          const val = p.availability?.[date]?.[String(slot)];
          if (isUnavailableMode) {
            if (val !== 0) count++;
          } else {
            if (val === 2) count++;
            else if (val === 1 && includeIfNeeded) count++;
          }
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
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.event.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {data.event.dates.length}일 · {data.participants.length}명 참여
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="h-[38px] px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? '복사됨!' : '링크 복사'}
            {!copied && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            )}
          </button>
          <Link
            href={`/e/${eventId}`}
            className="h-[38px] px-4 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-[var(--shadow-primary)] hover:shadow-[var(--shadow-primary-hover)] transition-all flex items-center"
          >
            내 시간 수정
          </Link>
        </div>
      </div>

      {data.participants.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-center py-12">아직 응답이 없습니다.</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Heatmap Grid */}
          <div className="flex-1 min-w-0">
            <HeatmapGrid
              dates={data.event.dates}
              timeStart={data.event.time_start}
              timeEnd={data.event.time_end}
              participants={data.participants}
              selectedIds={selectedIds}
              includeIfNeeded={includeIfNeeded}
              hoveredParticipantId={hoveredId}
              eventMode={data.event.mode}
            />

            {/* Legend */}
            <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
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
          </div>

          {/* Right: Responses + Options (timeful style sidebar) */}
          <div className="w-full lg:w-72 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              응답 ({data.participants.length}/{data.participants.length})
            </h2>

            <ParticipantFilter
              participants={data.participants}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              onHover={setHoveredId}
              onHoverEnd={() => setHoveredId(null)}
            />

            <Link
              href={`/e/${eventId}`}
              className="mt-3 block text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              + 내 시간 추가
            </Link>

            {/* Options */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIfNeeded}
                  onChange={(e) => setIncludeIfNeeded(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600"
                />
                &quot;되면 가능&quot; 포함
              </label>
            </div>

            {/* Best Times */}
            {bestTimes.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">베스트 타임</h2>
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
                        <span className={`text-sm font-medium tabular-nums ${ratio >= 0.75 ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {formatDateCompact(bt.date)} {slotToTime(bt.slot)}-{slotToTime(endSlot)}
                        </span>
                        <span className={`text-sm font-semibold ${ratio >= 0.75 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {bt.count}/{total}명
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AdBanner />

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">이 이벤트를 공유하세요:</p>
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
