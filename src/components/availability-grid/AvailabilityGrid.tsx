'use client';

import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';
import { generateSlots, SLOTS_PER_HOUR, CELL_HEIGHT, isDayOfWeekKey, DAY_OF_WEEK_LABELS } from '@/lib/constants';

interface AvailabilityGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  renderCell: (date: string, slot: number) => ReactNode;
  columnsProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: (el: HTMLElement | null) => void };
  header?: ReactNode;
  footer?: ReactNode;
  maxColumns?: number;
}

const GRID_WIDTH = 770; // 7 columns * 110px
const TIME_COL_WIDTH = 44;

function formatDateHeader(dateStr: string): { num: string; day: string } {
  if (isDayOfWeekKey(dateStr)) {
    return { num: '', day: DAY_OF_WEEK_LABELS[dateStr] };
  }
  const date = new Date(dateStr + 'T00:00:00');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return {
    num: `${m}.${d}`,
    day: `(${days[date.getDay()]})`,
  };
}

export default function AvailabilityGrid({
  dates,
  timeStart,
  timeEnd,
  renderCell,
  columnsProps,
  header,
  footer,
  maxColumns = 7,
}: AvailabilityGridProps) {
  const slots = generateSlots(timeStart, timeEnd);
  const [page, setPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(GRID_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(dates.length / maxColumns);
  const needsPagination = dates.length > maxColumns;

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        const available = containerRef.current.parentElement?.clientWidth ?? GRID_WIDTH + TIME_COL_WIDTH;
        setContainerWidth(Math.min(GRID_WIDTH, available - TIME_COL_WIDTH - (needsPagination ? 80 : 0) - 16));
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [needsPagination]);

  const visibleDates = useMemo(() => {
    if (!needsPagination) return dates;
    const start = page * maxColumns;
    return dates.slice(start, start + maxColumns);
  }, [dates, page, maxColumns, needsPagination]);

  // Detect date gaps (>1 day between consecutive dates) for visual separator.
  // Day-of-week mode has no calendar gaps — skip detection entirely.
  const dateGapIndices = useMemo(() => {
    const gaps = new Set<number>();
    if (visibleDates.some(isDayOfWeekKey)) return gaps;
    for (let i = 1; i < visibleDates.length; i++) {
      const prev = new Date(visibleDates[i - 1] + 'T00:00:00');
      const curr = new Date(visibleDates[i] + 'T00:00:00');
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 1) gaps.add(i);
    }
    return gaps;
  }, [visibleDates]);

  // Build grid template columns with gap spacers
  const gridTemplateCols = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < visibleDates.length; i++) {
      if (dateGapIndices.has(i)) parts.push('6px'); // gap spacer
      parts.push('1fr');
    }
    return parts.join(' ');
  }, [visibleDates.length, dateGapIndices]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="overflow-x-auto" ref={containerRef}>
        <div className="flex items-start mx-auto" style={{ width: '100%', maxWidth: containerWidth + TIME_COL_WIDTH + (needsPagination ? 80 : 0) }}>
          {/* Time labels */}
          <div className="shrink-0 flex flex-col" style={{ width: TIME_COL_WIDTH, paddingTop: 40 }}>
            {slots.map((slot) => (
              <div
                key={slot}
                className="flex items-start justify-end pr-3"
                style={{ height: CELL_HEIGHT }}
              >
                {slot % SLOTS_PER_HOUR === 0 && (
                  <span
                    className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums leading-none"
                    style={{ marginTop: -4 }}
                  >
                    {Math.floor(slot / SLOTS_PER_HOUR)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Grid columns — always GRID_WIDTH wide, columns fill with 1fr */}
          <div
            data-grid-container=""
            ref={columnsProps?.ref}
            className={`grid${columnsProps ? ' touch-none' : ''}`}
            style={{ flex: 1, minWidth: 0, gridTemplateColumns: gridTemplateCols }}
            {...(columnsProps ? (() => { const { ref: _ref, ...rest } = columnsProps; return rest; })() : {})}
          >
            {/* Date headers */}
            {visibleDates.map((date, colIdx) => {
              const { num, day } = formatDateHeader(date);
              const elements = [];
              if (dateGapIndices.has(colIdx)) {
                elements.push(<div key={`gap-hdr-${colIdx}`} />);
              }
              elements.push(
                <div key={`hdr-${date}`} className="flex items-center justify-center" style={{ height: 40 }}>
                  <span className="text-[13px] text-gray-600 dark:text-gray-300 tabular-nums">
                    {num}<span className="font-bold">{day}</span>
                  </span>
                </div>
              );
              return elements;
            })}

            {/* Grid cells */}
            {slots.map((slot, rowIdx) => (
              visibleDates.map((date, colIdx) => {
                const isFirst = colIdx === 0;
                const isLast = colIdx === visibleDates.length - 1;
                const isFirstRow = rowIdx === 0;
                const isLastRow = rowIdx === slots.length - 1;
                const hasGapBefore = dateGapIndices.has(colIdx);

                let border = 'border-r border-r-gray-200/60 dark:border-r-gray-700/60 ';
                if (isLast) border = 'border-r border-r-gray-300 dark:border-r-gray-600 ';
                if (isFirst) border += 'border-l border-l-gray-300 dark:border-l-gray-600 ';
                if (hasGapBefore) border += 'border-l-2 border-l-gray-300 dark:border-l-gray-600 ';

                if (isFirstRow) border += 'border-t border-t-gray-300 dark:border-t-gray-600 ';
                else if (slot % SLOTS_PER_HOUR === 0) border += 'border-t border-t-gray-300/80 dark:border-t-gray-600/80 ';
                else if (slot % SLOTS_PER_HOUR === 2) border += 'border-t border-t-gray-200/40 dark:border-t-gray-700/40 ';

                if (isLastRow) border += 'border-b border-b-gray-300 dark:border-b-gray-600 ';

                const elements = [];
                if (hasGapBefore) {
                  elements.push(<div key={`gap-${colIdx}-${slot}`} style={{ height: CELL_HEIGHT }} />);
                }
                elements.push(
                  <div key={`${date}-${slot}`} className={border} style={{ height: CELL_HEIGHT }}>
                    {renderCell(date, slot)}
                  </div>
                );
                return elements;
              })
            ))}
          </div>

          {/* Pagination arrows */}
          {needsPagination && (
            <div className="shrink-0 flex flex-col items-center gap-1 pt-1 pl-3" style={{ width: 36 }}>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!canPrev}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}
