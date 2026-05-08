'use client';

import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';
import { generateSlots, SLOTS_PER_HOUR, CELL_HEIGHT, isDayOfWeekKey, DAY_OF_WEEK_LABELS, TIME_COL_WIDTH_DESKTOP, TIME_COL_WIDTH_MOBILE } from '@/lib/constants';

interface AvailabilityGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  renderCell: (date: string, slot: number, indices?: { dateIdx: number; slotIdx: number }) => ReactNode;
  columnsProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: (el: HTMLElement | null) => void };
  disableTouchScroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  maxColumns?: number;
}

const GRID_WIDTH = 770; // 7 columns * 110px
// Time-label column hugs the widest hour ("23" ≈ 14px at 11px tabular-nums)
// plus the right gap to the grid. Source of truth: src/lib/constants.ts so
// downstream consumers (e.g. HeatmapLegend padding) stay in sync.
const timeColWidth_DESKTOP = TIME_COL_WIDTH_DESKTOP;
const timeColWidth_MOBILE = TIME_COL_WIDTH_MOBILE;
const MOBILE_BREAKPOINT = 640;
const HEADER_HEIGHT = 48;
const GAP_WIDTH = 6;

function getDevicePixelRatio() {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
}

function toDevicePixel(value: number, dpr: number) {
  return Math.max(1 / dpr, Math.round(value * dpr) / dpr);
}

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
  disableTouchScroll = false,
  header,
  footer,
  maxColumns = 7,
}: AvailabilityGridProps) {
  const slots = useMemo(() => generateSlots(timeStart, timeEnd), [timeStart, timeEnd]);
  const [page, setPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(GRID_WIDTH);
  const [timeColWidth, setTimeColWidth] = useState(timeColWidth_DESKTOP);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const columnsRestProps = useMemo(() => {
    if (!columnsProps) return undefined;
    const rest = { ...columnsProps };
    delete rest.ref;
    return rest;
  }, [columnsProps]);

  const totalPages = Math.ceil(dates.length / maxColumns);
  const needsPagination = dates.length > maxColumns;

  // When paginated, the prev button is folded INTO the time column header row
  // (so it sits flush next to the first date header). Time-col width grows to
  // 36px to fit the button. Right-side next button stays as its own 36px col.
  const effectiveTimeColWidth = needsPagination ? Math.max(36, timeColWidth) : timeColWidth;

  useEffect(() => {
    function updateWidth() {
      const dpr = getDevicePixelRatio();
      setDevicePixelRatio(dpr);
      const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
      const tcw = isMobile ? timeColWidth_MOBILE : timeColWidth_DESKTOP;
      setTimeColWidth(tcw);
      if (containerRef.current) {
        const available = containerRef.current.parentElement?.clientWidth ?? GRID_WIDTH + tcw;
        const effectiveTcw = needsPagination ? Math.max(36, tcw) : tcw;
        // Reserve space for time col (with prev btn folded in) + right next btn.
        setContainerWidth(Math.min(GRID_WIDTH, available - effectiveTcw - (needsPagination ? 36 : 0)));
      }
    }

    updateWidth();

    const observedParent = containerRef.current?.parentElement ?? null;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && observedParent) {
      observer = new ResizeObserver(updateWidth);
      observer.observe(observedParent);
    }

    window.addEventListener('resize', updateWidth, { passive: true });
    window.visualViewport?.addEventListener('resize', updateWidth, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
      window.visualViewport?.removeEventListener('resize', updateWidth);
    };
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
    const numCols = visibleDates.length;
    const gapWidth = toDevicePixel(GAP_WIDTH, devicePixelRatio);
    const lineWidth = toDevicePixel(1, devicePixelRatio);
    const gapTotal = dateGapIndices.size * gapWidth;
    const availableForCells = Math.max(lineWidth * numCols, containerWidth - gapTotal);
    const cellWidth = numCols > 0
      ? Math.max(lineWidth, Math.floor((availableForCells * devicePixelRatio) / numCols) / devicePixelRatio)
      : lineWidth;

    for (let i = 0; i < numCols; i++) {
      if (dateGapIndices.has(i)) parts.push(`${gapWidth}px`);
      parts.push(`${cellWidth}px`);
    }
    return parts.join(' ');
  }, [visibleDates.length, dateGapIndices, containerWidth, devicePixelRatio]);

  // Force the grid area to a width that divides evenly across columns. The 1fr
  // tracks then resolve to integer pixels and 1px borders land on exact device
  // pixels — sub-pixel smearing is what made some vertical lines render thicker
  // or thinner than others.
  const adjustedContainerWidth = useMemo(() => {
    const numCols = visibleDates.length;
    if (numCols === 0) return containerWidth;
    const gapWidth = toDevicePixel(GAP_WIDTH, devicePixelRatio);
    const lineWidth = toDevicePixel(1, devicePixelRatio);
    const gapTotal = dateGapIndices.size * gapWidth;
    const availableForCells = Math.max(lineWidth * numCols, containerWidth - gapTotal);
    const cell = Math.floor((availableForCells * devicePixelRatio) / numCols) / devicePixelRatio;
    if (cell <= 0) return containerWidth;
    return cell * numCols + gapTotal;
  }, [containerWidth, visibleDates.length, dateGapIndices, devicePixelRatio]);

  const gridLineWidth = toDevicePixel(1, devicePixelRatio);
  const slotHeight = toDevicePixel(CELL_HEIGHT, devicePixelRatio);
  const gapBarrierStyle: React.CSSProperties = {
    backgroundColor: 'rgba(229, 231, 235, 0.55)',
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 ${gridLineWidth * 3}px, rgba(153, 153, 153, 0.85) ${gridLineWidth * 3}px ${gridLineWidth * 4}px, transparent ${gridLineWidth * 4}px ${gridLineWidth * 7}px)`,
  };

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="overflow-x-auto lg:overflow-x-visible" ref={containerRef}>
        <div className={`flex items-start mx-auto ${needsPagination ? 'pr-0' : 'pr-7 sm:pr-0'}`} style={{ width: '100%', maxWidth: adjustedContainerWidth + effectiveTimeColWidth + (needsPagination ? 36 : 0) }}>
          {/* Time column. When paginated, the header row holds the prev button
              flush against the first date header. Otherwise the header area is
              an empty spacer matching HEADER_HEIGHT. */}
          <div className="shrink-0 flex flex-col" style={{ width: effectiveTimeColWidth }}>
            {needsPagination ? (
              <div
                className="flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
                style={{ height: HEADER_HEIGHT }}
              >
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!canPrev}
                  aria-label="이전 페이지"
                  className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              </div>
            ) : (
              <div style={{ height: HEADER_HEIGHT }} />
            )}
            {slots.map((slot, idx) => (
              <div
                key={slot}
                className="flex items-start justify-end pr-1"
                style={{ height: slotHeight }}
              >
                {slot % SLOTS_PER_HOUR === 0 && (
                  <span
                    className="text-[11px] font-bold text-gray-600 dark:text-gray-300 tabular-nums leading-none"
                    style={{ marginTop: idx === 0 ? 0 : -4 }}
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
            className={`grid${disableTouchScroll ? ' touch-none' : ''}`}
            style={{
              flex: '0 0 auto',
              width: adjustedContainerWidth,
              minWidth: adjustedContainerWidth,
              gridTemplateColumns: gridTemplateCols,
            }}
            {...columnsRestProps}
          >
            {/* Date headers — sticky to viewport top on desktop while scrolling time grid */}
            {visibleDates.map((date, colIdx) => {
              const { num, day } = formatDateHeader(date);
              const elements = [];
              if (dateGapIndices.has(colIdx)) {
                elements.push(
                  <div
                    key={`gap-hdr-${colIdx}`}
                    className="lg:sticky lg:top-16 lg:z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
                    style={{ height: HEADER_HEIGHT }}
                  />
                );
              }
              elements.push(
                <div
                  key={`hdr-${date}`}
                  className="flex items-center justify-center px-1 lg:sticky lg:top-16 lg:z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
                  style={{ height: HEADER_HEIGHT }}
                >
                  <span className="flex flex-col items-center justify-center gap-0.5 text-center text-gray-600 dark:text-gray-300 tabular-nums leading-tight">
                    {num && <span className="text-[11px] font-medium">{num}</span>}
                    <span className="text-[12px] font-bold">{day}</span>
                  </span>
                </div>
              );
              return elements;
            })}

            {/* Grid cells */}
            {slots.map((slot, rowIdx) => (
              visibleDates.map((date, colIdx) => {
                const isFirst = colIdx === 0;
                const isFirstRow = rowIdx === 0;
                const isLastRow = rowIdx === slots.length - 1;
                const hasGapBefore = dateGapIndices.has(colIdx);

                const lineColor = '#999999';
                const isHourLine = isFirstRow || slot % SLOTS_PER_HOUR === 0;
                const isHalfHourLine = !isFirstRow && slot % SLOTS_PER_HOUR === 2;

                // Direct borders on the cell wrapper. More reliable than inset
                // box-shadow on a transparent overlay — inset shadows can be
                // visually overpowered by the cell's own background stacking.
                const cellBorder: React.CSSProperties = {
                  boxSizing: 'border-box',
                  borderRight: `${gridLineWidth}px solid ${lineColor}`,
                };
                if (isFirst) cellBorder.borderLeft = `${gridLineWidth}px solid ${lineColor}`;
                else if (hasGapBefore) cellBorder.borderLeft = `${gridLineWidth * 2}px solid ${lineColor}`;
                if (isHalfHourLine) cellBorder.borderTop = `${gridLineWidth}px dashed ${lineColor}`;
                else if (isHourLine) cellBorder.borderTop = `${gridLineWidth}px solid ${lineColor}`;
                if (isLastRow) cellBorder.borderBottom = `${gridLineWidth}px solid ${lineColor}`;

                const elements = [];
                if (hasGapBefore) {
                  elements.push(<div key={`gap-${colIdx}-${slot}`} style={{ height: slotHeight, ...gapBarrierStyle }} />);
                }
                elements.push(
                  <div
                    key={`${date}-${slot}`}
                    style={{ height: slotHeight, position: 'relative', ...cellBorder }}
                  >
                    {renderCell(date, slot, { dateIdx: colIdx, slotIdx: rowIdx })}
                  </div>
                );
                return elements;
              })
            ))}
          </div>

          {/* Pagination — next (right). Same sticky behavior as prev. */}
          {needsPagination && (
            <div
              className="shrink-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
              style={{ width: 36, height: HEADER_HEIGHT }}
            >
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                aria-label="다음 페이지"
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
