'use client';

import { useMemo } from 'react';
import { Participant } from '@/lib/types';

interface CalendarHeatmapGridProps {
  dates: string[];
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
  onCellHover?: (date: string | null) => void;
  bestSlots?: Set<string>;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BASE_COLOR = '#059669';

function parseDate(s: string) {
  return new Date(s + 'T00:00:00');
}

export default function CalendarHeatmapGrid({
  dates,
  participants,
  selectedIds,
  includeIfNeeded,
  onCellHover,
  bestSlots,
}: CalendarHeatmapGridProps) {
  const dateSet = useMemo(() => new Set(dates), [dates]);
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const total = filtered.length;
  const hasBestSlots = bestSlots && bestSlots.size > 0;

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

  function getCount(date: string): number {
    let count = 0;
    for (const p of filtered) {
      const val = p.availability?.[date]?.['all_day'];
      if (val === 2) count++;
      else if (val === 1 && includeIfNeeded) count++;
    }
    return count;
  }

  function getCellBg(date: string): string | undefined {
    if (!dateSet.has(date)) return undefined;
    const count = getCount(date);
    const slotKey = `${date}-all_day`;

    if (hasBestSlots) {
      return bestSlots!.has(slotKey) ? BASE_COLOR + 'FF' : undefined;
    }

    if (total === 0 || count === 0) return undefined;
    if (count === total) return BASE_COLOR + 'FF';
    const alpha = Math.floor((count / total) * (225 - 30) + 30);
    return BASE_COLOR + alpha.toString(16).padStart(2, '0').toUpperCase();
  }

  return (
    <div className="overflow-x-auto">
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
              const isFullColor = bg && bg.endsWith('FF');

              return (
                <div
                  key={dateStr}
                  className={`aspect-square flex items-center justify-center text-sm relative cursor-pointer transition-colors
                    ${isEventDate ? 'hover:brightness-95' : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'}`}
                  style={{ backgroundColor: isEventDate ? (bg || undefined) : undefined }}
                  onMouseEnter={() => isEventDate && onCellHover?.(dateStr)}
                  onMouseLeave={() => onCellHover?.(null)}
                >
                  <span className={`${isFullColor ? 'text-white font-semibold' : isEventDate ? 'text-gray-700 dark:text-gray-300' : ''}`}>
                    {day}
                  </span>
                  {count > 0 && isEventDate && (
                    <span className={`absolute bottom-0.5 right-1 text-[8px] font-medium ${isFullColor ? 'text-white/70' : 'text-emerald-500'}`}>
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
