'use client';

import { useRef, useMemo } from 'react';
import { Availability, AvailabilityLevel, EventMode } from '@/lib/types';

interface CalendarDragGridProps {
  dates: string[];
  availability: Availability;
  onAvailabilityChange: (a: Availability) => void;
  activeMode: AvailabilityLevel;
  eventMode: EventMode;
  overlayCountMap: Record<string, Record<string, number>>;
  overlayTotal: number;
}

const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: 'bg-gray-100',
  0: 'bg-red-200',
  1: 'bg-[#FFE8B8]',
  2: 'bg-[#86EFAC]',
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(s: string) {
  return new Date(s + 'T00:00:00');
}

export default function CalendarDragGrid({
  dates,
  availability,
  onAvailabilityChange,
  activeMode,
  overlayCountMap,
  overlayTotal,
}: CalendarDragGridProps) {
  const isDragging = useRef(false);
  const erasing = useRef(false);
  const draftRef = useRef<Availability>({});
  const dateSet = useMemo(() => new Set(dates), [dates]);

  // Determine month range to display
  const sortedDates = useMemo(() => [...dates].sort(), [dates]);
  const firstDate = parseDate(sortedDates[0]);
  const lastDate = parseDate(sortedDates[sortedDates.length - 1]);

  // Build calendar months
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

  function getCellValue(date: string): AvailabilityLevel | -1 {
    const val = availability[date]?.['all_day'];
    return val !== undefined ? val : -1;
  }

  function applyToDate(date: string) {
    if (!dateSet.has(date)) return;
    const draft = { ...draftRef.current };
    if (activeMode === 0 || erasing.current) {
      const dateCopy = { ...draft[date] };
      delete dateCopy['all_day'];
      if (Object.keys(dateCopy).length === 0) delete draft[date];
      else draft[date] = dateCopy;
    } else {
      draft[date] = { ...draft[date], all_day: activeMode };
    }
    draftRef.current = draft;
    onAvailabilityChange(draft);
  }

  function handlePointerDown(date: string) {
    if (!dateSet.has(date)) return;
    isDragging.current = true;
    draftRef.current = JSON.parse(JSON.stringify(availability));
    erasing.current = false;
    if (activeMode !== 0) {
      const existing = availability[date]?.['all_day'];
      if (existing === activeMode) erasing.current = true;
    }
    applyToDate(date);
  }

  function handlePointerMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const cell = el.closest('[data-cal-date]') as HTMLElement | null;
    if (!cell) return;
    applyToDate(cell.dataset.calDate!);
  }

  function handlePointerUp() {
    isDragging.current = false;
    erasing.current = false;
  }

  return (
    <div
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      className="select-none"
    >
      {months.map((month) => (
        <div key={`${month.year}-${month.month}`} className="mb-6">
          {/* Month header */}
          <h3 className="text-center text-base font-bold text-gray-900 mb-3">{month.label}</h3>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            {month.days.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="bg-gray-50 aspect-square" />;
              }

              const isEventDate = dateSet.has(dateStr);
              const value = getCellValue(dateStr);
              const day = parseInt(dateStr.split('-')[2]);
              const hasOverlay = overlayTotal > 0 && (overlayCountMap[dateStr]?.['all_day'] ?? 0) > 0;

              return (
                <div
                  key={dateStr}
                  data-cal-date={dateStr}
                  onMouseDown={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
                  className={`aspect-square flex items-center justify-center text-sm relative transition-colors
                    ${isEventDate ? `${CELL_COLORS[value]} cursor-pointer hover:brightness-95` : 'bg-gray-50 text-gray-300'}
                    ${isEventDate && value >= 1 ? 'font-semibold text-gray-800' : ''}
                    ${isEventDate && value === -1 ? 'text-gray-500' : ''}`}
                >
                  {day}
                  {hasOverlay && isEventDate && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-500 font-medium">
                      +{overlayCountMap[dateStr]?.['all_day'] ?? 0}
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
