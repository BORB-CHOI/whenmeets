'use client';

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Availability, AvailabilityLevel, EventMode } from '@/lib/types';
import { isDayOfWeekKey, DAY_OF_WEEK_LABELS } from '@/lib/constants';
import { getCellColorClass } from './GridCell';
import MonthCalendarGrid from '@/components/calendar-grid/MonthCalendarGrid';

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
  'bg-[#FAD3D3]',
  'bg-[#FFE8B8]',
];

function cellLabel(dateStr: string): string | number {
  return isDayOfWeekKey(dateStr) ? DAY_OF_WEEK_LABELS[dateStr] : parseInt(dateStr.split('-')[2]);
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
    const clone: Availability = {};
    for (const d in availability) {
      clone[d] = { ...availability[d] };
    }
    draftRef.current = clone;
    erasing.current = availability[date]?.['all_day'] === activeMode;
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
      onAvailabilityChange({ ...draftRef.current });
    }
    isDragging.current = false;
    erasing.current = false;
  }, [onAvailabilityChange]);

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
    <MonthCalendarGrid
      dates={dates}
      rootRef={setRootEl}
      rootProps={{
        onMouseMove: (e) => handlePointerMoveAt(e.clientX, e.clientY),
        style: { touchAction: 'pan-y' },
      }}
      renderCell={(dateStr, isActive) => {
        if (!dateStr) {
          return <div className="bg-gray-50 aspect-square" />;
        }
        if (!isActive) {
          return (
            <div className="bg-gray-50 aspect-square flex items-center justify-center text-sm text-gray-300">
              {cellLabel(dateStr)}
            </div>
          );
        }
        const value = getCellValue(dateStr);
        const hasOverlay = overlayTotal > 0 && (overlayCountMap[dateStr]?.['all_day'] ?? 0) > 0;
        return (
          <div
            data-cal-date={dateStr}
            onMouseDown={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
            onTouchStart={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
            className={`aspect-square flex items-center justify-center text-sm relative ${getCellColorClass(value, eventMode)} cursor-pointer hover:outline-2 hover:outline-gray-900 hover:-outline-offset-2 ${value >= 1 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}
          >
            {cellLabel(dateStr)}
            {hasOverlay && (
              <span className="absolute bottom-0.5 right-1 text-[8px] text-teal-500 font-medium">
                +{overlayCountMap[dateStr]?.['all_day'] ?? 0}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
