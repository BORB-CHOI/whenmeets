'use client';

import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { isDayOfWeekKey } from '@/lib/constants';

const DAY_HEADERS_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function getDevicePixelRatio() {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
}

function toDevicePixel(value: number, dpr: number) {
  return Math.max(1 / dpr, Math.round(value * dpr) / dpr);
}

interface MonthCalendarGridProps {
  dates: string[];
  renderCell: (date: string | null, isActive: boolean) => ReactNode;
  rootProps?: Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;
  rootRef?: (el: HTMLDivElement | null) => void;
}

function parseDate(s: string) {
  return new Date(s + 'T00:00:00');
}

export default function MonthCalendarGrid({
  dates,
  renderCell,
  rootProps,
  rootRef,
}: MonthCalendarGridProps) {
  const dateSet = useMemo(() => new Set(dates), [dates]);
  const isDayOfWeekMode = useMemo(() => dates.some(isDayOfWeekKey), [dates]);

  const sortedDates = useMemo(
    () => [...dates].filter((d) => !isDayOfWeekKey(d)).sort(),
    [dates],
  );

  const months = useMemo(() => {
    if (isDayOfWeekMode || sortedDates.length === 0) return [];
    const firstDate = parseDate(sortedDates[0]);
    const lastDate = parseDate(sortedDates[sortedDates.length - 1]);
    const result: { year: number; month: number; label: string; days: (string | null)[] }[] = [];
    let y = firstDate.getFullYear();
    let m = firstDate.getMonth();
    const endY = lastDate.getFullYear();
    const endM = lastDate.getMonth();

    while (y < endY || (y === endY && m <= endM)) {
      const label = new Date(y, m).toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' });
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
  }, [isDayOfWeekMode, sortedDates]);

  // Force every grid cell to an integer pixel size so the 1px gap-based
  // separators land on exact device pixels in every column. Without this,
  // CSS Grid's `1fr` distribution rounds sub-pixels, which the browser then
  // smears into uneven 0.5/1/1.5px gap lines.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      setDevicePixelRatio(getDevicePixelRatio());
      setWrapperWidth(el.clientWidth);
    };
    update();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(el);
    }
    window.addEventListener('resize', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  // 7 columns + 6 gap-px = 6px of horizontal gap inside the grid frame.
  const lineWidth = toDevicePixel(1, devicePixelRatio);
  const gapTotal = lineWidth * 6;
  const cellSize = wrapperWidth > 0
    ? Math.max(lineWidth, Math.floor(((wrapperWidth - gapTotal) * devicePixelRatio) / 7) / devicePixelRatio)
    : 0;
  const adjustedWidth = cellSize > 0 ? cellSize * 7 + gapTotal : 0;
  const gridStyle: React.CSSProperties = cellSize > 0
    ? { gridTemplateColumns: `repeat(7, ${cellSize}px)`, width: adjustedWidth, gap: lineWidth, borderWidth: lineWidth }
    : { gridTemplateColumns: 'repeat(7, 1fr)' };

  const headerRowStyle: React.CSSProperties = cellSize > 0
    ? { gridTemplateColumns: `repeat(7, ${cellSize}px)`, width: adjustedWidth, gap: lineWidth }
    : { gridTemplateColumns: 'repeat(7, 1fr)' };

  const dayHeaders = (
    <div className="grid mb-1 mx-auto" style={headerRowStyle}>
      {DAY_HEADERS_KO.map((d) => (
        <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
      ))}
    </div>
  );

  const setRefs = (el: HTMLDivElement | null) => {
    wrapperRef.current = el;
    rootRef?.(el);
  };

  if (isDayOfWeekMode) {
    return (
      <div ref={setRefs} className="select-none" {...rootProps}>
        {dayHeaders}
        <div className="grid bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mx-auto" style={gridStyle}>
          {DOW_ORDER.map((dow) => (
            <Fragment key={dow}>{renderCell(dow, dateSet.has(dow))}</Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={setRefs} className="select-none" {...rootProps}>
      {months.map((month) => (
        <div key={`${month.year}-${month.month}`} className="mb-6">
          <h3 className="text-center text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            {month.label}
          </h3>
          {dayHeaders}
          <div className="grid bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mx-auto" style={gridStyle}>
            {month.days.map((dateStr, idx) => (
              <Fragment key={dateStr ?? `empty-${idx}`}>
                {renderCell(dateStr, dateStr ? dateSet.has(dateStr) : false)}
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
