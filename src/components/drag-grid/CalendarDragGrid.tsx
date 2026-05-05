'use client';

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Availability, AvailabilityLevel, EventMode } from '@/lib/types';
import { getCellColorClass } from './GridCell';

interface CalendarDragGridProps {
  dates: string[];
  availability: Availability;
  onAvailabilityChange: (a: Availability) => void;
  activeMode: AvailabilityLevel;
  eventMode: EventMode;
  overlayCountMap: Record<string, Record<string, number>>;
  overlayTotal: number;
  disabled?: boolean;
}

const COLOR_CLASSES_TO_REMOVE = [
  'bg-gray-100',
  'bg-red-400/45',
  'bg-amber-300/55',
  'bg-teal-600/[.47]',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(s: string) {
  return new Date(s + 'T00:00:00');
}

export default function CalendarDragGrid({
  dates,
  availability,
  onAvailabilityChange,
  activeMode,
  eventMode,
  overlayCountMap,
  overlayTotal,
  disabled,
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

  // Paint cell DOM directly during drag (no React re-render)
  function paintCell(date: string, value: AvailabilityLevel | -1) {
    const el = document.querySelector(`[data-cal-date="${date}"]`) as HTMLElement | null;
    if (!el) return;
    el.classList.remove(...COLOR_CLASSES_TO_REMOVE);
    const cls = getCellColorClass(value, eventMode);
    if (cls) el.classList.add(...cls.split(' '));
  }

  function applyToDate(date: string) {
    if (!dateSet.has(date)) return;
    const draft = draftRef.current;
    if (erasing.current) {
      if (draft[date]) {
        const dateCopy = { ...draft[date] };
        delete dateCopy['all_day'];
        if (Object.keys(dateCopy).length === 0) delete draft[date];
        else draft[date] = dateCopy;
      }
      paintCell(date, -1);
    } else {
      draft[date] = { ...draft[date], all_day: activeMode };
      paintCell(date, activeMode);
    }
  }

  function handlePointerDown(date: string) {
    if (disabled) return;
    if (!dateSet.has(date)) return;
    isDragging.current = true;
    // Shallow clone for draft — mutated during drag, committed on end
    const clone: Availability = {};
    for (const d in availability) {
      clone[d] = { ...availability[d] };
    }
    draftRef.current = clone;
    erasing.current = false;
    if (activeMode !== 0) {
      const existing = availability[date]?.['all_day'];
      if (existing === activeMode) erasing.current = true;
    }
    applyToDate(date);
  }

  const rafId = useRef(0);

  function handlePointerMoveAt(clientX: number, clientY: number) {
    if (!isDragging.current) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return;
      const cell = el.closest('[data-cal-date]') as HTMLElement | null;
      if (!cell) return;
      applyToDate(cell.dataset.calDate!);
    });
  }

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      // Commit draft to React state once on drag end
      onAvailabilityChange({ ...draftRef.current });
    }
    isDragging.current = false;
    erasing.current = false;
  }, [onAvailabilityChange]);

  // Window-level listeners for drag end
  useEffect(() => {
    function onEnd() { if (isDragging.current) handlePointerUp(); }
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [handlePointerUp]);

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  // Native (non-passive) touchmove so preventDefault works on mobile.
  // React's synthetic onTouchMove is passive by default in modern React.
  useEffect(() => {
    if (!rootEl) return;
    function onTouchMoveNative(e: TouchEvent) {
      if (!isDragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      handlePointerMoveAt(touch.clientX, touch.clientY);
    }
    rootEl.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => {
      rootEl.removeEventListener('touchmove', onTouchMoveNative);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootEl]);

  return (
    <div
      ref={setRootEl}
      onMouseMove={(e) => handlePointerMoveAt(e.clientX, e.clientY)}
      className="select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {months.map((month) => (
        <div key={`${month.year}-${month.month}`} className="mb-6">
          {/* Month header */}
          <h3 className="text-center text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{month.label}</h3>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {month.days.map((dateStr, idx) => {
              if (!dateStr) {
                return <div key={`empty-${idx}`} className="bg-gray-50 dark:bg-gray-800 aspect-square" />;
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
                  onTouchStart={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
                  className={`aspect-square flex items-center justify-center text-sm relative
                    ${isEventDate ? `${getCellColorClass(value, eventMode)} cursor-pointer hover:outline hover:outline-2 hover:outline-teal-500 hover:-outline-offset-2` : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600'}
                    ${isEventDate && value >= 1 ? 'font-semibold text-gray-800 dark:text-gray-200' : ''}
                    ${isEventDate && value === -1 ? 'text-gray-500 dark:text-gray-400' : ''}`}
                >
                  {day}
                  {hasOverlay && isEventDate && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-teal-500 font-medium">
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
