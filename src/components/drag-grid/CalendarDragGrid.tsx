'use client';

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Availability, AvailabilityLevel, EventMode } from '@/lib/types';
import { isDayOfWeekKey, DAY_OF_WEEK_LABELS } from '@/lib/constants';
import { getCellColorClass, getCellCssColor } from './GridCell';
import MonthCalendarGrid from '@/components/calendar-grid/MonthCalendarGrid';
import useGridTouch from './useGridTouch';

interface CalendarDragGridProps {
  dates: string[];
  availability: Availability;
  onAvailabilityChange: (a: Availability) => void;
  activeMode: AvailabilityLevel;
  eventMode: EventMode;
  overlayCountMap: Record<string, Record<string, number>>;
  overlayTotal: number;
  disabled?: boolean;
  /** Hover preview: 셀에 진입 시 date, 떠날 때 null. date_only 그리드는 항상
   *  slot 인자를 보내지 않는다 (호출처에서 'all_day' 로 lookup). */
  onCellHover?: (date: string | null) => void;
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
  onCellHover,
}: CalendarDragGridProps) {
  const lastHoveredDate = useRef<string | null>(null);

  const getDateCell = useCallback((target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    return (target.closest('[data-cal-date]') as HTMLElement | null) ?? null;
  }, []);

  const isDragging = useRef(false);
  const erasing = useRef(false);
  const draftRef = useRef<Availability>({});
  const paintedDates = useRef(new Set<string>());
  const [tappedDate, setTappedDate] = useState<string | null>(null);
  const dateSet = useMemo(() => new Set(dates), [dates]);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  const getCellAtPoint = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    if (!element || !rootEl?.contains(element)) return null;
    return element.closest<HTMLElement>('[data-cal-date]');
  }, [rootEl]);

  function getCellValue(date: string): AvailabilityLevel | -1 {
    const val = availability[date]?.['all_day'];
    return val !== undefined ? val : -1;
  }

  // Paint cell DOM directly during drag (no React re-render)
  const paintCell = useCallback((date: string, value: AvailabilityLevel | -1) => {
    const el = document.querySelector(`[data-cal-date="${date}"]`) as HTMLElement | null;
    if (!el) return;
    el.classList.remove(...COLOR_CLASSES_TO_REMOVE);
    const cls = getCellColorClass(value, eventMode);
    if (cls) el.classList.add(...cls.split(' '));
  }, [eventMode]);

  const applyToDate = useCallback((date: string) => {
    if (!dateSet.has(date)) return;
    paintedDates.current.add(date);
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
  }, [activeMode, dateSet, paintCell]);

  function handlePointerDown(date: string) {
    if (disabled || isDragging.current || !dateSet.has(date)) return false;
    isDragging.current = true;
    paintedDates.current.clear();
    const clone: Availability = {};
    for (const d in availability) {
      clone[d] = { ...availability[d] };
    }
    draftRef.current = clone;
    erasing.current = availability[date]?.['all_day'] === activeMode;
    applyToDate(date);
    return true;
  }

  const rafId = useRef(0);

  const applyAtPoint = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const cell = getCellAtPoint(clientX, clientY);
    if (cell) applyToDate(cell.dataset.calDate!);
  }, [getCellAtPoint, applyToDate]);

  const handlePointerMoveAt = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => applyAtPoint(clientX, clientY));
  }, [applyAtPoint]);

  const handlePointerUp = useCallback((commit = true) => {
    cancelAnimationFrame(rafId.current);
    if (isDragging.current) {
      if (commit) onAvailabilityChange({ ...draftRef.current });
      else for (const date of paintedDates.current) paintCell(date, availability[date]?.all_day ?? -1);
    }
    isDragging.current = false;
    erasing.current = false;
    paintedDates.current.clear();
    setTappedDate(null);
  }, [onAvailabilityChange, availability, paintCell]);

  const ignoreMouse = useGridTouch({
    container: rootEl,
    disabled,
    onStart: (x, y) => {
      const date = getCellAtPoint(x, y)?.dataset.calDate;
      if (!date || !handlePointerDown(date)) return false;
      setTappedDate(date);
      return true;
    },
    onMove: applyAtPoint,
    onEnd: (x, y) => { applyAtPoint(x, y); handlePointerUp(); },
    onCancel: () => handlePointerUp(false),
  });

  useEffect(() => {
    function onMouseEnd(e: MouseEvent) {
      if (!isDragging.current) return;
      applyAtPoint(e.clientX, e.clientY);
      handlePointerUp();
    }
    window.addEventListener('mouseup', onMouseEnd);
    return () => {
      window.removeEventListener('mouseup', onMouseEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [handlePointerUp, applyAtPoint]);

  return (
    <MonthCalendarGrid
      dates={dates}
      rootRef={setRootEl}
      rootProps={{
        onMouseMove: (e) => handlePointerMoveAt(e.clientX, e.clientY),
        onMouseOver: (e) => {
          if (!onCellHover) return;
          const cell = getDateCell(e.target);
          const date = cell?.dataset.calDate ?? null;
          if (!date || lastHoveredDate.current === date) return;
          lastHoveredDate.current = date;
          onCellHover(date);
        },
        onMouseLeave: () => {
          if (!onCellHover) return;
          lastHoveredDate.current = null;
          onCellHover(null);
        },
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
        const isTealBg = getCellCssColor(value, eventMode).startsWith('rgba(0,172,193');
        const isTapped = tappedDate === dateStr;
        return (
          <div
            data-cal-date={dateStr}
            onMouseDown={(e) => {
              if (e.button !== 0 || disabled) return;
              if (ignoreMouse()) return;
              e.preventDefault();
              handlePointerDown(dateStr);
            }}
            className={`aspect-square flex items-center justify-center text-sm relative ${getCellColorClass(value, eventMode)} cursor-pointer hover:outline-2 hover:outline-dashed hover:outline-gray-900 hover:-outline-offset-2 ${value >= 1 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}
            style={isTapped ? { outline: '2px dashed #111827', outlineOffset: '-2px' } : undefined}
          >
            {cellLabel(dateStr)}
            {hasOverlay && (
              <span
                className="absolute bottom-0.5 right-1 text-[8px] font-medium"
                style={{ color: isTealBg ? 'rgba(255,255,255,0.9)' : 'rgba(17,24,39,0.75)' }}
              >
                +{overlayCountMap[dateStr]?.['all_day'] ?? 0}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
