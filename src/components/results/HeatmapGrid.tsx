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

const BASE_COLOR = '#059669'; // Emerald 600

function hexAlpha(alpha: number): string {
  return alpha.toString(16).padStart(2, '0').toUpperCase();
}

function computeCellColor(count: number, total: number): string | undefined {
  if (total === 0 || count === 0) return undefined;
  if (count === total) return BASE_COLOR + 'E0'; // ~88% opacity for full attendance
  const alpha = Math.floor((count / total) * (200 - 30) + 30);
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
            className="w-full h-full relative cursor-pointer hover:brightness-125 hover:z-10 heatmap-cell"
            style={{ backgroundColor: bgColor }}
            onMouseEnter={() => onCellHover?.(date, slot)}
            onMouseLeave={() => onCellHover?.(null)}
          >
            {count > 0 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums pointer-events-none select-none"
                style={{ color: count === total ? 'rgba(255,255,255,0.9)' : 'rgba(5,150,105,0.7)' }}
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
