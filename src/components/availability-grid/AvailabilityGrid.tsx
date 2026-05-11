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

const GRID_WIDTH = 770;
const MOBILE_BREAKPOINT = 640;
const HEADER_HEIGHT = 48;
const DATE_GAP_WIDTH = 6;
const PAGINATION_BTN = 36;
const LINE_COLOR = '#999999';

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
  // 0 = not yet measured. Render a placeholder until first layout to avoid
  // hydration flash where the grid first paints at desktop width on mobile.
  const [containerWidth, setContainerWidth] = useState(0);
  const [timeColWidth, setTimeColWidth] = useState(TIME_COL_WIDTH_DESKTOP);
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

  // Left column folds the prev-pagination button into the header row when
  // paginating; right side mirrors that width so the grid sits centered.
  const effectiveTimeColWidth = needsPagination ? Math.max(PAGINATION_BTN, timeColWidth) : timeColWidth;
  const rightSpacerWidth = needsPagination ? PAGINATION_BTN : timeColWidth;
  const lineWidth = toDevicePixel(1, devicePixelRatio);

  useEffect(() => {
    function updateWidth() {
      const dpr = getDevicePixelRatio();
      setDevicePixelRatio(dpr);
      const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
      const tcw = isMobile ? TIME_COL_WIDTH_MOBILE : TIME_COL_WIDTH_DESKTOP;
      setTimeColWidth(tcw);
      if (containerRef.current) {
        const available = containerRef.current.parentElement?.clientWidth ?? GRID_WIDTH + tcw;
        const effTcw = needsPagination ? Math.max(PAGINATION_BTN, tcw) : tcw;
        const rightW = needsPagination ? PAGINATION_BTN : tcw;
        const outerBorder = 2 * toDevicePixel(1, dpr);
        const gridInner = available - effTcw - rightW - outerBorder;
        setContainerWidth(Math.max(0, Math.min(GRID_WIDTH, gridInner)));
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

  // Layout math. Cell widths and the date-gap spacer are device-pixel aligned
  // so the column-gap (the "lines") lands on exact device pixels in every column.
  const { gridTemplateCols, adjustedContainerWidth } = useMemo(() => {
    const numCols = visibleDates.length;
    const numSpacers = dateGapIndices.size;
    const dateGap = toDevicePixel(DATE_GAP_WIDTH, devicePixelRatio);
    const totalItems = numCols + numSpacers;
    const interiorGapsTotal = Math.max(0, totalItems - 1) * lineWidth;
    const spacerTotal = numSpacers * dateGap;
    const availableForCells = Math.max(
      lineWidth * numCols,
      containerWidth - interiorGapsTotal - spacerTotal,
    );
    const cellWidth = numCols > 0
      ? Math.max(lineWidth, Math.floor((availableForCells * devicePixelRatio) / numCols) / devicePixelRatio)
      : lineWidth;

    const parts: string[] = [];
    for (let i = 0; i < numCols; i++) {
      if (dateGapIndices.has(i)) parts.push(`${dateGap}px`);
      parts.push(`${cellWidth}px`);
    }

    return {
      gridTemplateCols: parts.join(' '),
      adjustedContainerWidth: cellWidth * numCols + spacerTotal + interiorGapsTotal,
    };
  }, [visibleDates.length, dateGapIndices, containerWidth, devicePixelRatio, lineWidth]);

  const slotHeight = toDevicePixel(CELL_HEIGHT, devicePixelRatio);
  const gridOuterWidth = adjustedContainerWidth + 2 * lineWidth;
  const totalFlexWidth = gridOuterWidth + effectiveTimeColWidth + rightSpacerWidth;
  const measured = containerWidth > 0;
  const placeholderHeight = HEADER_HEIGHT + slots.length * CELL_HEIGHT;

  const gapBarrierStyle: React.CSSProperties = {
    backgroundColor: 'rgba(229, 231, 235, 0.55)',
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 ${lineWidth * 3}px, rgba(153, 153, 153, 0.85) ${lineWidth * 3}px ${lineWidth * 4}px, transparent ${lineWidth * 4}px ${lineWidth * 7}px)`,
  };

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="overflow-x-auto lg:overflow-x-visible" ref={containerRef}>
        {!measured ? (
          <div style={{ height: placeholderHeight }} aria-hidden />
        ) : (
          <div className="flex items-start mx-auto" style={{ width: '100%', maxWidth: totalFlexWidth }}>
            {/* Left column: hour labels (with prev-pagination button at top when paginated) */}
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

            {/* Main column: date headers stacked on top of the cell grid. They share
                gridTemplateColumns so columns line up exactly. The headers use a
                white column-gap (invisible against the white header bg); the cell
                grid uses a gray column-gap which becomes the visible vertical lines. */}
            <div className="flex flex-col" style={{ flex: '0 0 auto', width: gridOuterWidth }}>
              {/* Date header row — sticky on desktop. */}
              <div
                className="grid bg-white/80 dark:bg-gray-900/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
                style={{
                  gridTemplateColumns: gridTemplateCols,
                  columnGap: `${lineWidth}px`,
                  paddingLeft: lineWidth,
                  paddingRight: lineWidth,
                  boxSizing: 'content-box',
                  width: adjustedContainerWidth,
                }}
              >
                {visibleDates.map((date, colIdx) => {
                  const elements: ReactNode[] = [];
                  if (dateGapIndices.has(colIdx)) {
                    elements.push(
                      <div key={`gap-hdr-${colIdx}`} style={{ height: HEADER_HEIGHT }} />,
                    );
                  }
                  const { num, day } = formatDateHeader(date);
                  elements.push(
                    <div
                      key={`hdr-${date}`}
                      className="flex items-center justify-center px-1"
                      style={{ height: HEADER_HEIGHT }}
                    >
                      <span className="flex flex-col items-center justify-center gap-0.5 text-center text-gray-600 dark:text-gray-300 tabular-nums leading-tight">
                        {num && <span className="text-[11px] font-medium">{num}</span>}
                        <span className="text-[12px] font-bold">{day}</span>
                      </span>
                    </div>,
                  );
                  return elements;
                })}
              </div>

              {/* Cell grid — gap-as-line for vertical separators (sub-pixel safe pattern
                  used everywhere else in the codebase, see MonthCalendarGrid). Cells get
                  their borderTop only for hour/half-hour rows; bottom edge of the grid
                  is drawn as a single container borderBottom. */}
              <div
                data-grid-container=""
                ref={columnsProps?.ref}
                className={`grid${disableTouchScroll ? ' touch-none' : ''}`}
                style={{
                  gridTemplateColumns: gridTemplateCols,
                  columnGap: `${lineWidth}px`,
                  backgroundColor: LINE_COLOR,
                  borderLeft: `${lineWidth}px solid ${LINE_COLOR}`,
                  borderRight: `${lineWidth}px solid ${LINE_COLOR}`,
                  borderBottom: `${lineWidth}px solid ${LINE_COLOR}`,
                  boxSizing: 'content-box',
                  width: adjustedContainerWidth,
                }}
                {...columnsRestProps}
              >
                {slots.map((slot, rowIdx) => (
                  visibleDates.map((date, colIdx) => {
                    const hasGapBefore = dateGapIndices.has(colIdx);
                    const isFirstRow = rowIdx === 0;
                    const isHourLine = isFirstRow || slot % SLOTS_PER_HOUR === 0;
                    const isHalfHourLine = !isFirstRow && slot % SLOTS_PER_HOUR === 2;

                    const cellStyle: React.CSSProperties = {
                      height: slotHeight,
                      position: 'relative',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                    };
                    if (isHalfHourLine) cellStyle.borderTop = `${lineWidth}px dashed ${LINE_COLOR}`;
                    else if (isHourLine) cellStyle.borderTop = `${lineWidth}px solid ${LINE_COLOR}`;

                    const elements: ReactNode[] = [];
                    if (hasGapBefore) {
                      elements.push(
                        <div key={`gap-${colIdx}-${slot}`} style={{ height: slotHeight, ...gapBarrierStyle }} />,
                      );
                    }
                    elements.push(
                      <div key={`${date}-${slot}`} style={cellStyle}>
                        {renderCell(date, slot, { dateIdx: colIdx, slotIdx: rowIdx })}
                      </div>,
                    );
                    return elements;
                  })
                ))}
              </div>
            </div>

            {/* Right side: next-pagination button OR a mirror spacer that matches
                the left time column so the cell grid stays visually centered. */}
            {needsPagination ? (
              <div
                className="shrink-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
                style={{ width: PAGINATION_BTN, height: HEADER_HEIGHT }}
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
            ) : (
              <div className="shrink-0" style={{ width: rightSpacerWidth }} aria-hidden />
            )}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
