'use client';

import { useMemo, useRef } from 'react';
import { EventMode, Participant, AvailabilityLevel } from '@/lib/types';
import { generateSlots } from '@/lib/constants';
import { resolveCellColor } from '@/lib/heatmap';
import { getCellCssColor } from '@/components/drag-grid/GridCell';
import AvailabilityGrid from '@/components/availability-grid/AvailabilityGrid';
import type { HoverInfoPosition } from '@/components/ui/HoverInfoPopover';

// Touch movement threshold (px) — beyond this, treat as scroll instead of tap.
const TAP_MOVEMENT_THRESHOLD = 8;

interface HeatmapGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
  hoveredParticipantId?: string | null;
  /** Called on hover with the cursor position in viewport coords. */
  onCellHover?: (date: string | null, slot?: number, position?: HoverInfoPosition) => void;
  onCellSelect?: (date: string, slot: number) => void;
  bestSlots?: Set<string>;
  eventMode?: EventMode;
}

function getEventCell(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest('[data-date][data-slot]') as HTMLElement | null;
}

export default function HeatmapGrid({
  dates,
  timeStart,
  timeEnd,
  participants,
  selectedIds,
  includeIfNeeded,
  hoveredParticipantId,
  onCellHover,
  onCellSelect,
  bestSlots,
  eventMode = 'available',
}: HeatmapGridProps) {
  const touchPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number; pid: number; date: string; slot: number } | null>(null);
  const touchMoved = useRef(false);
  const lastHoveredKey = useRef<string | null>(null);
  const filtered = useMemo(() => {
    if (hoveredParticipantId) {
      const hovered = participants.find((p) => p.id === hoveredParticipantId);
      return hovered ? [hovered] : [];
    }
    return participants.filter((p) => selectedIds.has(p.id));
  }, [participants, selectedIds, hoveredParticipantId]);
  const total = filtered.length;

  const hasBestSlots = bestSlots && bestSlots.size > 0;
  const slots = useMemo(() => generateSlots(timeStart, timeEnd), [timeStart, timeEnd]);

  const effectiveIncludeIfNeeded = hoveredParticipantId || filtered.length === 1
    ? true
    : includeIfNeeded;

  const cellStats = useMemo(() => {
    const counts = new Map<string, number>();

    for (const p of filtered) {
      for (const date of dates) {
        const slotsForDate = p.availability?.[date];
        for (const slot of slots) {
          const val = slotsForDate?.[String(slot)];
          const isAvailable = eventMode === 'unavailable'
            ? val !== 0
            : val === 2 || (val === 1 && effectiveIncludeIfNeeded);
          if (!isAvailable) continue;

          const key = `${date}-${slot}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }

    return { counts };
  }, [dates, eventMode, filtered, effectiveIncludeIfNeeded, slots]);

  const singleParticipant = filtered.length === 1 ? filtered[0] : null;

  function clearTouchPreviewTimer() {
    if (touchPreviewTimer.current) {
      clearTimeout(touchPreviewTimer.current);
      touchPreviewTimer.current = null;
    }
  }

  function emitHover(cell: HTMLElement, e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>, yOffset = 0) {
    const key = `${cell.dataset.date}-${cell.dataset.slot}`;
    if (lastHoveredKey.current === key) return;
    lastHoveredKey.current = key;
    onCellHover?.(cell.dataset.date!, Number(cell.dataset.slot), {
      x: e.clientX,
      y: e.clientY + yOffset,
      width: 0,
      height: 0,
    });
  }

  const gridPointerProps = onCellHover || onCellSelect
    ? {
        onMouseOver: (e: React.MouseEvent<HTMLDivElement>) => {
          if (!onCellHover) return;
          const cell = getEventCell(e.target);
          if (cell) emitHover(cell, e);
        },
        onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
          if (e.pointerType === 'mouse') {
            return;
          }

          const ts = touchStart.current;
          if (!ts || ts.pid !== e.pointerId || touchMoved.current) return;
          const dx = e.clientX - ts.x;
          const dy = e.clientY - ts.y;
          if (dx * dx + dy * dy > TAP_MOVEMENT_THRESHOLD * TAP_MOVEMENT_THRESHOLD) {
            touchMoved.current = true;
            clearTouchPreviewTimer();
          }
        },
        onPointerLeave: () => {
          clearTouchPreviewTimer();
          lastHoveredKey.current = null;
          onCellHover?.(null);
        },
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          const cell = getEventCell(e.target);
          if (!cell) return;

          const date = cell.dataset.date!;
          const slot = Number(cell.dataset.slot);
          if (e.pointerType === 'mouse') {
            onCellSelect?.(date, slot);
            return;
          }

          touchStart.current = { x: e.clientX, y: e.clientY, pid: e.pointerId, date, slot };
          touchMoved.current = false;
          clearTouchPreviewTimer();
        },
        onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
          if (e.pointerType === 'mouse') return;
          const ts = touchStart.current;
          touchStart.current = null;
          clearTouchPreviewTimer();
          lastHoveredKey.current = null;
          onCellHover?.(null);
          if (ts && ts.pid === e.pointerId && !touchMoved.current) {
            onCellSelect?.(ts.date, ts.slot);
          }
          touchMoved.current = false;
        },
        onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
          if (e.pointerType === 'mouse') return;
          touchStart.current = null;
          touchMoved.current = false;
          clearTouchPreviewTimer();
          lastHoveredKey.current = null;
          onCellHover?.(null);
        },
      }
    : undefined;

  return (
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      columnsProps={gridPointerProps}
      renderCell={(date, slot) => {
        const slotKey = `${date}-${slot}`;
        const count = cellStats.counts.get(slotKey) ?? 0;
        const isBest = bestSlots?.has(slotKey) ?? false;

        let bgColor: string | undefined;
        if (hasBestSlots) {
          bgColor = isBest ? resolveCellColor({ count: 1, total: 1, isBest: true, hasBestSlots: true }) : undefined;
        } else if (singleParticipant) {
          const rawVal = singleParticipant.availability?.[date]?.[String(slot)];
          const val: AvailabilityLevel | -1 = rawVal === 0 || rawVal === 1 || rawVal === 2 ? rawVal : -1;
          bgColor = getCellCssColor(val, eventMode) || undefined;
        } else {
          bgColor = resolveCellColor({ count, total, isBest, hasBestSlots: false });
        }

        return (
          <div
            data-date={date}
            data-slot={slot}
            className="w-full h-full relative cursor-pointer hover:outline-2 hover:outline-teal-400 hover:-outline-offset-1"
            style={{ backgroundColor: bgColor }}
          >
            {count > 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums pointer-events-none select-none leading-none"
                style={{ color: (hasBestSlots && isBest) || count === total ? 'rgba(255,255,255,0.92)' : 'rgba(0,137,123,0.7)' }}
              >
                {count}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
