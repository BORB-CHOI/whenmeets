'use client';

import { Participant } from '@/lib/types';
import AvailabilityGrid from '@/components/availability-grid/AvailabilityGrid';

interface HeatmapGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
  hoveredParticipantId?: string | null;
  onCellHover?: (date: string | null, slot?: number) => void;
  bestSlots?: Set<string>;
}

const BASE_COLOR = '#4F46E5';

function hexAlpha(alpha: number): string {
  return alpha.toString(16).padStart(2, '0').toUpperCase();
}

function computeCellColor(count: number, total: number): string | undefined {
  if (total === 0 || count === 0) return undefined;
  if (count === total) return BASE_COLOR + 'FF';
  const alpha = Math.floor((count / total) * (225 - 30) + 30);
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
  bestSlots,
}: HeatmapGridProps) {
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const total = filtered.length;

  const hasBestSlots = bestSlots && bestSlots.size > 0;

  function getCount(date: string, slot: number): number {
    let count = 0;
    for (const p of filtered) {
      const val = p.availability?.[date]?.[String(slot)];
      if (val === 2) count++;
      else if (val === 1 && includeIfNeeded) count++;
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
          bgColor = isBest ? BASE_COLOR + 'FF' : undefined;
        } else {
          bgColor = computeCellColor(count, total);
        }

        // Hovered participant highlight
        const isHoveredAvailable =
          hoveredParticipantId &&
          filtered.some((p) => {
            if (p.id !== hoveredParticipantId) return false;
            const val = p.availability?.[date]?.[String(slot)];
            return val === 2 || (val === 1 && includeIfNeeded);
          });

        return (
          <div
            className="w-full h-full relative cursor-pointer"
            style={{
              backgroundColor: bgColor,
              ...(isHoveredAvailable
                ? {
                    outline: '1.5px dashed #111827',
                    outlineOffset: '-1px',
                    zIndex: 10,
                  }
                : {}),
            }}
            onMouseEnter={() => onCellHover?.(date, slot)}
            onMouseLeave={() => onCellHover?.(null)}
          />
        );
      }}
    />
  );
}
