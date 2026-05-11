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
  const [containerWidth, setContainerWidth] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [timeColWidth, setTimeColWidth] = useState(TIME_COL_WIDTH_DESKTOP);
  const containerRef = useRef<HTMLDivElement>(null);
  const columnsRestProps = useMemo(() => {
    if (!columnsProps) return undefined;
    const rest = { ...columnsProps };
    delete rest.ref;
    return rest;
  }, [columnsProps]);

  const totalPages = Math.ceil(dates.length / maxColumns);
  const needsPagination = dates.length > maxColumns;

  const effectiveTimeColWidth = needsPagination ? Math.max(PAGINATION_BTN, timeColWidth) : timeColWidth;
  const rightSpacerWidth = needsPagination ? PAGINATION_BTN : timeColWidth;
  const lineWidth = 1;

  useEffect(() => {
    function updateWidth() {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
      const tcw = isMobile ? TIME_COL_WIDTH_MOBILE : TIME_COL_WIDTH_DESKTOP;
      setTimeColWidth(tcw);
      if (containerRef.current) {
        const available = containerRef.current.parentElement?.clientWidth ?? GRID_WIDTH + tcw;
        setAvailableWidth(available);
        const effTcw = needsPagination ? Math.max(PAGINATION_BTN, tcw) : tcw;
        const rightW = needsPagination ? PAGINATION_BTN : tcw;
        const gridInner = available - effTcw - rightW;
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

  const { gridTemplateCols, adjustedContainerWidth } = useMemo(() => {
    const numCols = visibleDates.length;
    const parts: string[] = [];
    for (let i = 0; i < numCols; i++) {
      if (dateGapIndices.has(i)) {
        parts.push(`${DATE_GAP_WIDTH}px`);
      }
      parts.push('minmax(0, 1fr)');
    }

    return {
      gridTemplateCols: parts.join(' '),
      adjustedContainerWidth: containerWidth,
    };
  }, [visibleDates.length, dateGapIndices, containerWidth]);

  const slotHeight = CELL_HEIGHT;
  const gridOuterWidth = adjustedContainerWidth;
  const totalFlexWidth = gridOuterWidth + effectiveTimeColWidth + rightSpacerWidth;
  const centeredMarginLeft = Math.max(0, Math.floor((availableWidth - totalFlexWidth) / 2));
  const measured = containerWidth > 0;
  const placeholderHeight = HEADER_HEIGHT + slots.length * CELL_HEIGHT;

  const gapBarrierStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'rgb(240, 241, 244)',
    overflow: 'hidden',
  };
  const gapHatchStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: lineWidth,
    right: lineWidth,
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
          <div
            className="flex items-start"
            style={{
              width: totalFlexWidth,
              marginLeft: centeredMarginLeft,
            }}
          >
            <div className="shrink-0 flex flex-col" style={{ width: effectiveTimeColWidth }}>
              {needsPagination ? (
                <div
                  className="flex items-center justify-center bg-white/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
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
                      className="text-[11px] font-bold text-gray-600 tabular-nums leading-none"
                      style={{ marginTop: idx === 0 ? 0 : -4 }}
                    >
                      {Math.floor(slot / SLOTS_PER_HOUR)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col" style={{ flex: '0 0 auto', width: gridOuterWidth }}>
              <div
                className="grid bg-white/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
                style={{
                  gridTemplateColumns: gridTemplateCols,
                  boxSizing: 'content-box',
                  width: adjustedContainerWidth,
                  marginLeft: lineWidth,
                }}
              >
                {visibleDates.flatMap((date, colIdx) => {
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
                      <span className="flex flex-col items-center justify-center gap-0.5 text-center text-gray-600 tabular-nums leading-tight">
                        {num && <span className="text-[11px] font-medium">{num}</span>}
                        <span className="text-[12px] font-bold">{day}</span>
                      </span>
                    </div>,
                  );
                  return elements;
                })}
              </div>

              <div
                data-grid-container=""
                ref={columnsProps?.ref}
                className={`grid${disableTouchScroll ? ' touch-none' : ''}`}
                style={{
                  gridTemplateColumns: gridTemplateCols,
                  boxSizing: 'content-box',
                  width: adjustedContainerWidth,
                }}
                {...columnsRestProps}
              >
                {slots.map((slot, rowIdx) => (
                  visibleDates.flatMap((date, colIdx) => {
                    const hasGapBefore = dateGapIndices.has(colIdx);
                    const isFirstRow = rowIdx === 0;
                    const isHourLine = isFirstRow || slot % SLOTS_PER_HOUR === 0;
                    const isHalfHourLine = !isFirstRow && slot % SLOTS_PER_HOUR === 2;

                    const cellStyle: React.CSSProperties = {
                      height: slotHeight,
                      position: 'relative',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      borderRight: `${lineWidth}px solid ${LINE_COLOR}`,
                    };
                    if (colIdx === 0 || hasGapBefore) {
                      cellStyle.borderLeft = `${lineWidth}px solid ${LINE_COLOR}`;
                    }
                    if (rowIdx === slots.length - 1) {
                      cellStyle.borderBottom = `${lineWidth}px solid ${LINE_COLOR}`;
                    }
                    if (isHalfHourLine) cellStyle.borderTop = `${lineWidth}px dashed ${LINE_COLOR}`;
                    else if (isHourLine) cellStyle.borderTop = `${lineWidth}px solid ${LINE_COLOR}`;

                    const elements: ReactNode[] = [];
                    if (hasGapBefore) {
                      const gapStyle: React.CSSProperties = {
                        height: slotHeight,
                        ...gapBarrierStyle,
                      };
                      if (isHalfHourLine) gapStyle.borderTop = `${lineWidth}px dashed ${LINE_COLOR}`;
                      else if (isHourLine) gapStyle.borderTop = `${lineWidth}px solid ${LINE_COLOR}`;
                      if (rowIdx === slots.length - 1) {
                        gapStyle.borderBottom = `${lineWidth}px solid ${LINE_COLOR}`;
                      }
                      elements.push(
                        <div key={`gap-${colIdx}-${slot}`} style={gapStyle}>
                          <div style={gapHatchStyle} />
                        </div>,
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

            {needsPagination ? (
              <div
                className="shrink-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md lg:sticky lg:top-16 lg:z-20"
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
