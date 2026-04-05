'use client';

import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';
import { generateSlots, SLOTS_PER_HOUR } from '@/lib/constants';

interface AvailabilityGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  renderCell: (date: string, slot: number) => ReactNode;
  columnsProps?: React.HTMLAttributes<HTMLDivElement>;
  header?: ReactNode;
  footer?: ReactNode;
  maxColumns?: number;
}

const GRID_WIDTH = 770; // 7 columns * 110px
const TIME_COL_WIDTH = 44;

function formatDateHeader(dateStr: string): { num: string; day: string } {
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

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="flex justify-center" ref={containerRef}>
        <div className="flex items-start w-full" style={{ maxWidth: containerWidth + TIME_COL_WIDTH + (needsPagination ? 80 : 0) }}>
          {/* Time labels */}
          <div className="shrink-0 flex flex-col" style={{ width: TIME_COL_WIDTH, paddingTop: 40 }}>
            {slots.map((slot) => (
              <div
                key={slot}
                className="flex items-start justify-end pr-3"
                style={{ height: 32 }}
              >
                {slot % SLOTS_PER_HOUR === 0 && (
                  <span
                    className="text-[13px] text-gray-400 tabular-nums leading-none"
                    style={{ marginTop: -5 }}
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
            className={`grid${columnsProps ? ' touch-none' : ''}`}
            style={{ flex: 1, minWidth: 0, gridTemplateColumns: `repeat(${visibleDates.length}, 1fr)` }}
            {...columnsProps}
          >
            {/* Date headers */}
            {visibleDates.map((date) => {
              const { num, day } = formatDateHeader(date);
              return (
                <div key={`hdr-${date}`} className="flex items-center justify-center" style={{ height: 40 }}>
                  <span
                    className="text-[13px] text-gray-600 tabular-nums"
                                      >
                    {num}<span className="font-bold">{day}</span>
                  </span>
                </div>
              );
            })}

            {/* Grid cells */}
            {slots.map((slot, rowIdx) => (
              visibleDates.map((date, colIdx) => {
                const isFirst = colIdx === 0;
                const isLast = colIdx === visibleDates.length - 1;
                const isFirstRow = rowIdx === 0;
                const isLastRow = rowIdx === slots.length - 1;

                let border = 'border-r border-r-[#ddd9] ';
                if (isLast) border = 'border-r border-r-[#BDBDBD] ';
                if (isFirst) border += 'border-l border-l-[#BDBDBD] ';

                if (isFirstRow) border += 'border-t border-t-[#BDBDBD] ';
                else if (slot % SLOTS_PER_HOUR === 0) border += 'border-t border-t-[#ddd9] ';
                else if (slot % SLOTS_PER_HOUR === 2) border += 'border-t border-dashed border-t-[#ddd9] ';

                if (isLastRow) border += 'border-b border-b-[#BDBDBD] ';

                return (
                  <div key={`${date}-${slot}`} className={border} style={{ height: 32 }}>
                    {renderCell(date, slot)}
                  </div>
                );
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
