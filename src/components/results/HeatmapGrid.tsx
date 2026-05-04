'use client';

import { useRef } from 'react';
import { EventMode, Participant } from '@/lib/types';
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

const BASE_COLOR = '#059669'; // Emerald 600

function hexAlpha(alpha: number): string {
  return alpha.toString(16).padStart(2, '0').toUpperCase();
}

function computeCellColor(count: number, total: number): string | undefined {
  if (total === 0 || count === 0) return undefined;
  if (count === total) return BASE_COLOR;
  const alpha = Math.floor((count / total) * (185 - 35) + 35);
  return BASE_COLOR + hexAlpha(alpha);
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
  const touchStart = useRef<{ x: number; y: number; pid: number } | null>(null);
  const touchMoved = useRef(false);
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const total = filtered.length;

  const hasBestSlots = bestSlots && bestSlots.size > 0;

  function getCount(date: string, slot: number): number {
    let count = 0;
    for (const p of filtered) {
      const val = p.availability?.[date]?.[String(slot)];
      if (eventMode === 'unavailable') {
        // 안 되는 시간 모드: val=0(불가)으로 표시되지 않은 참가자는 가능으로 간주
        if (val !== 0) count++;
      } else {
        if (val === 2) count++;
        else if (val === 1 && includeIfNeeded) count++;
      }
    }
    return count;
  }

  return (
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      renderCell={(date, slot) => {
        const count = getCount(date, slot);
        const slotKey = `${date}-${slot}`;
        const isBest = bestSlots?.has(slotKey);

        // Best slots filter: when active, only best cells get color
        let bgColor: string | undefined;
        if (hasBestSlots) {
          bgColor = isBest ? BASE_COLOR : undefined;
        } else {
          bgColor = computeCellColor(count, total);
        }

        // Hovered participant highlight
        const isHoveredAvailable =
          hoveredParticipantId &&
          filtered.some((p) => {
            if (p.id !== hoveredParticipantId) return false;
            const val = p.availability?.[date]?.[String(slot)];
            if (eventMode === 'unavailable') return val !== 0;
            return val === 2 || (val === 1 && includeIfNeeded);
          });

        const emitHoverAtPointer = (e: React.PointerEvent<HTMLDivElement>, yOffset = 0) => {
          onCellHover?.(date, slot, {
            x: e.clientX,
            y: e.clientY + yOffset,
            width: 0,
            height: 0,
          });
        };

        const clearTouchPreviewTimer = () => {
          if (touchPreviewTimer.current) {
            clearTimeout(touchPreviewTimer.current);
            touchPreviewTimer.current = null;
          }
        };

        return (
          <div
            className="w-full h-full relative cursor-pointer hover:brightness-125 hover:outline-2 hover:outline-emerald-400 hover:-outline-offset-1 hover:z-10"
            style={{ backgroundColor: bgColor }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') emitHoverAtPointer(e);
            }}
            onPointerLeave={() => {
              clearTouchPreviewTimer();
              onCellHover?.(null);
            }}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse') {
                onCellSelect?.(date, slot);
                return;
              }
              // Touch: defer onCellSelect until pointerUp so we can distinguish
              // tap from scroll (a scroll should NOT open the bottom sheet).
              touchStart.current = { x: e.clientX, y: e.clientY, pid: e.pointerId };
              touchMoved.current = false;
              clearTouchPreviewTimer();
            }}
            onPointerMove={(e) => {
              if (e.pointerType === 'mouse') {
                emitHoverAtPointer(e);
                return;
              }
              // Touch move: detect scroll intent
              const ts = touchStart.current;
              if (!ts || ts.pid !== e.pointerId) return;
              if (touchMoved.current) return;
              const dx = e.clientX - ts.x;
              const dy = e.clientY - ts.y;
              if (dx * dx + dy * dy > TAP_MOVEMENT_THRESHOLD * TAP_MOVEMENT_THRESHOLD) {
                touchMoved.current = true;
                clearTouchPreviewTimer();
              }
            }}
            onPointerUp={(e) => {
              if (e.pointerType === 'mouse') return;
              const ts = touchStart.current;
              touchStart.current = null;
              clearTouchPreviewTimer();
              onCellHover?.(null);
              // Only treat as tap if pointer didn't move (i.e. not a scroll).
              if (ts && ts.pid === e.pointerId && !touchMoved.current) {
                onCellSelect?.(date, slot);
              }
              touchMoved.current = false;
            }}
            onPointerCancel={(e) => {
              if (e.pointerType === 'mouse') return;
              touchStart.current = null;
              touchMoved.current = false;
              clearTouchPreviewTimer();
              onCellHover?.(null);
            }}
          >
            {count > 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums pointer-events-none select-none leading-none"
                style={{ color: (hasBestSlots && isBest) || count === total ? 'rgba(255,255,255,0.92)' : 'rgba(5,150,105,0.7)' }}
              >
                {count}
              </span>
            )}
            {isHoveredAvailable && (
              <div className="absolute inset-0 bg-emerald-500/20 ring-2 ring-inset ring-emerald-400" />
            )}
          </div>
        );
      }}
    />
  );
}
