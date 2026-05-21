'use client';

import { useEffect, useMemo, useRef } from 'react';
import { EventMode, Participant, AvailabilityLevel } from '@/lib/types';
import { resolveCellColor, getStepColor, getCellTextColor } from '@/lib/heatmap';
import { getCellCssColor } from '@/components/drag-grid/GridCell';
import { isDayOfWeekKey, DAY_OF_WEEK_LABELS } from '@/lib/constants';
import MonthCalendarGrid from '@/components/calendar-grid/MonthCalendarGrid';

interface CalendarHeatmapGridProps {
  dates: string[];
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
  hoveredParticipantId?: string | null;
  onCellHover?: (date: string | null) => void;
  onCellSelect?: (date: string) => void;
  selectedCell?: { date: string; slot: number | null } | null;
  bestSlots?: Set<string>;
  eventMode?: EventMode;
}

const TAP_MOVEMENT_THRESHOLD = 10;

const FULL_COLOR = getStepColor(5);

function getDateCell(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('[data-cal-date]') as HTMLElement | null;
}

function cellLabel(dateStr: string): string | number {
  return isDayOfWeekKey(dateStr) ? DAY_OF_WEEK_LABELS[dateStr] : parseInt(dateStr.split('-')[2]);
}

export default function CalendarHeatmapGrid({
  dates,
  participants,
  selectedIds,
  includeIfNeeded,
  hoveredParticipantId,
  onCellHover,
  onCellSelect,
  selectedCell,
  bestSlots,
  eventMode = 'available',
}: CalendarHeatmapGridProps) {
  const lastHoveredDate = useRef<string | null>(null);
  const touchStart = useRef<{ x: number; y: number; date: string; pid: number } | null>(null);
  const touchMoved = useRef(false);

  useEffect(() => {
    lastHoveredDate.current = null;
  }, [selectedCell]);

  const filtered = useMemo(() => {
    if (hoveredParticipantId) {
      const hovered = participants.find((p) => p.id === hoveredParticipantId);
      return hovered ? [hovered] : [];
    }
    return participants.filter((p) => selectedIds.has(p.id));
  }, [participants, selectedIds, hoveredParticipantId]);
  const total = filtered.length;
  const hasBestSlots = bestSlots && bestSlots.size > 0;
  const effectiveIncludeIfNeeded = hoveredParticipantId || filtered.length === 1
    ? true
    : includeIfNeeded;

  const countMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      for (const date of dates) {
        const val = p.availability?.[date]?.['all_day'];
        const isAvailable = eventMode === 'unavailable'
          ? val !== 0
          : val === 2 || (val === 1 && effectiveIncludeIfNeeded);
        if (isAvailable) {
          counts.set(date, (counts.get(date) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [dates, eventMode, filtered, effectiveIncludeIfNeeded]);

  function getCount(date: string): number {
    return countMap.get(date) ?? 0;
  }

  const singleParticipant = filtered.length === 1 ? filtered[0] : null;

  function getCellBg(date: string): string | undefined {
    const count = getCount(date);
    const slotKey = `${date}-all_day`;
    const isBest = hasBestSlots ? bestSlots!.has(slotKey) : false;

    if (hasBestSlots) {
      return isBest ? getStepColor(5) : undefined;
    }

    if (singleParticipant) {
      const rawVal = singleParticipant.availability?.[date]?.['all_day'];
      const val: AvailabilityLevel | -1 = rawVal === 0 || rawVal === 1 || rawVal === 2 ? rawVal : -1;
      return getCellCssColor(val, eventMode) || undefined;
    }

    return resolveCellColor({
      count,
      total,
      isBest,
      hasBestSlots: false,
    });
  }

  return (
    <MonthCalendarGrid
      dates={dates}
      rootProps={{
        onMouseOver: (e) => {
          if (!onCellHover || selectedCell) return;
          const cell = getDateCell(e.target);
          if (!cell) return;
          const date = cell.dataset.calDate!;
          if (lastHoveredDate.current === date) return;
          lastHoveredDate.current = date;
          onCellHover(date);
        },
        onMouseLeave: () => {
          lastHoveredDate.current = null;
          onCellHover?.(null);
        },
        onPointerDown: (e) => {
          const cell = getDateCell(e.target);
          const date = cell?.dataset.calDate;
          if (!date) return;
          if (e.pointerType === 'mouse') {
            onCellSelect?.(date);
            return;
          }
          touchStart.current = { x: e.clientX, y: e.clientY, date, pid: e.pointerId };
          touchMoved.current = false;
        },
        onPointerMove: (e) => {
          if (e.pointerType === 'mouse') return;
          const ts = touchStart.current;
          if (!ts || ts.pid !== e.pointerId || touchMoved.current) return;
          const dx = e.clientX - ts.x;
          const dy = e.clientY - ts.y;
          if (dx * dx + dy * dy > TAP_MOVEMENT_THRESHOLD * TAP_MOVEMENT_THRESHOLD) {
            touchMoved.current = true;
          }
        },
        onPointerUp: (e) => {
          if (e.pointerType === 'mouse') return;
          const ts = touchStart.current;
          touchStart.current = null;
          if (ts && ts.pid === e.pointerId && !touchMoved.current) {
            onCellSelect?.(ts.date);
          }
          touchMoved.current = false;
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
        const bg = getCellBg(dateStr);
        const count = getCount(dateStr);
        const isFullColor = bg === FULL_COLOR;
        const isSelected = selectedCell?.date === dateStr;
        return (
          <div
            data-cal-date={dateStr}
            className={`aspect-square flex items-center justify-center text-sm relative cursor-pointer hover:outline-2 hover:outline-dashed hover:outline-gray-900 hover:-outline-offset-2 ${
              isSelected
                ? 'z-1 outline-2 outline-dashed outline-gray-900 -outline-offset-2'
                : ''
            }`}
            style={{ backgroundColor: bg || undefined }}
          >
            <span className={isFullColor ? 'text-white font-semibold' : 'text-gray-700'}>
              {cellLabel(dateStr)}
            </span>
            {!singleParticipant && count > 0 && (
              <span className="absolute bottom-0.5 right-1 text-[8px] font-medium" style={{ color: getCellTextColor(bg) }}>
                {count}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
