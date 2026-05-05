'use client';

import { useMemo, useRef } from 'react';
import { EventMode, Participant } from '@/lib/types';
import { resolveCellColor, getStepColor } from '@/lib/heatmap';

interface CalendarHeatmapGridProps {
  dates: string[];
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
  hoveredParticipantId?: string | null;
  onCellHover?: (date: string | null) => void;
  bestSlots?: Set<string>;
  eventMode?: EventMode;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_COLOR = getStepColor(5); // #00695C — used for "isFullColor" check (count===total or best)

function parseDate(s: string) {
  return new Date(s + 'T00:00:00');
}

function getDateCell(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('[data-cal-date]') as HTMLElement | null;
}

export default function CalendarHeatmapGrid({
  dates,
  participants,
  selectedIds,
  includeIfNeeded,
  hoveredParticipantId,
  onCellHover,
  bestSlots,
  eventMode = 'available',
}: CalendarHeatmapGridProps) {
  const lastHoveredDate = useRef<string | null>(null);
  const dateSet = useMemo(() => new Set(dates), [dates]);
  const filtered = useMemo(() => {
    if (hoveredParticipantId) {
      const hovered = participants.find((p) => p.id === hoveredParticipantId);
      return hovered ? [hovered] : [];
    }
    return participants.filter((p) => selectedIds.has(p.id));
  }, [participants, selectedIds, hoveredParticipantId]);
  const total = filtered.length;
  const hasBestSlots = bestSlots && bestSlots.size > 0;
  const effectiveIncludeIfNeeded = hoveredParticipantId || filtered.length === 1
    ? true
    : includeIfNeeded;

  const sortedDates = useMemo(() => [...dates].sort(), [dates]);
  const firstDate = parseDate(sortedDates[0]);
  const lastDate = parseDate(sortedDates[sortedDates.length - 1]);

  const months = useMemo(() => {
    const result: { year: number; month: number; label: string; days: (string | null)[] }[] = [];
    let y = firstDate.getFullYear();
    let m = firstDate.getMonth();
    const endY = lastDate.getFullYear();
    const endM = lastDate.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
      const label = new Date(y, m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDow = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const days: (string | null)[] = [];

      for (let i = 0; i < firstDow; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push(ds);
      }

      result.push({ year: y, month: m, label, days });
      if (m === 11) { m = 0; y++; } else { m++; }
    }
    return result;
  }, [firstDate, lastDate]);

  const countMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      for (const date of dates) {
        const val = p.availability?.[date]?.['all_day'];
        const isAvailable = eventMode === 'unavailable'
          ? val !== 0
          : val === 2 || (val === 1 && effectiveIncludeIfNeeded);
        if (isAvailable) {
          counts.set(date, (counts.get(date) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [dates, eventMode, filtered, effectiveIncludeIfNeeded]);

  function getCount(date: string): number {
    return countMap.get(date) ?? 0;
  }

  function getCellBg(date: string): string | undefined {
    if (!dateSet.has(date)) return undefined;
    const count = getCount(date);
    const slotKey = `${date}-all_day`;
    const isBest = hasBestSlots ? bestSlots!.has(slotKey) : false;

    return resolveCellColor({
      count,
      total,
      isBest,
      hasBestSlots: !!hasBestSlots,
    });
  }

  return (
    <div
      className="overflow-x-auto"
      onMouseOver={(e) => {
        if (!onCellHover) return;
        const cell = getDateCell(e.target);
        if (!cell) return;
        const date = cell.dataset.calDate!;
        if (lastHoveredDate.current === date) return;
        lastHoveredDate.current = date;
        onCellHover(date);
      }}
      onMouseLeave={() => {
        lastHoveredDate.current = null;
        onCellHover?.(null);
      }}
    >
      {months.map((month) => (
        <div key={`${month.year}-${month.month}`} className="mb-6">
          <h3 className="text-center text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{month.label}</h3>

          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {month.days.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="bg-gray-50 dark:bg-gray-800 aspect-square" />;
              }

              const isEventDate = dateSet.has(dateStr);
              const bg = getCellBg(dateStr);
              const day = parseInt(dateStr.split('-')[2]);
              const count = isEventDate ? getCount(dateStr) : 0;
              const isFullColor = bg === FULL_COLOR;

              return (
                <div
                  key={dateStr}
                  data-cal-date={isEventDate ? dateStr : undefined}
                  className={`aspect-square flex items-center justify-center text-sm relative cursor-pointer
                    ${isEventDate ? 'hover:outline hover:outline-2 hover:outline-teal-500 hover:-outline-offset-2' : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'}`}
                  style={{ backgroundColor: isEventDate ? (bg || undefined) : undefined }}
                >
                  <span className={`${isFullColor ? 'text-white font-semibold' : isEventDate ? 'text-gray-700 dark:text-gray-300' : ''}`}>
                    {day}
                  </span>
                  {count > 0 && isEventDate && (
                    <span className={`absolute bottom-0.5 right-1 text-[8px] font-medium ${isFullColor ? 'text-white/70' : 'text-teal-500'}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
