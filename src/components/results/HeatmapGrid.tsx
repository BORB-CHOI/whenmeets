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
}

export default function HeatmapGrid({
  dates,
  timeStart,
  timeEnd,
  participants,
  selectedIds,
  includeIfNeeded,
  hoveredParticipantId,
}: HeatmapGridProps) {
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const total = filtered.length;

  function getCount(date: string, slot: number): number {
    let count = 0;
    for (const p of filtered) {
      const val = p.availability?.[date]?.[String(slot)];
      if (val === 2) count++;
      else if (val === 1 && includeIfNeeded) count++;
    }
    return count;
  }

  function isHoveredAvailable(date: string, slot: number): boolean {
    if (!hoveredParticipantId) return false;
    const p = participants.find((p) => p.id === hoveredParticipantId);
    if (!p) return false;
    const val = p.availability?.[date]?.[String(slot)];
    return val === 2 || (val === 1 && includeIfNeeded);
  }

  function getColor(count: number): string {
    if (total === 0 || count === 0) return 'bg-gray-50';
    const ratio = count / total;
    if (ratio <= 0.25) return 'bg-indigo-100';
    if (ratio <= 0.5) return 'bg-indigo-200';
    if (ratio <= 0.75) return 'bg-indigo-400';
    return 'bg-indigo-500';
  }

  return (
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      renderCell={(date, slot) => {
        const count = getCount(date, slot);
        const highlighted = hoveredParticipantId ? isHoveredAvailable(date, slot) : false;
        return (
          <div
            className={`w-[44px] h-[28px] border-r border-gray-200 ${getColor(count)} flex items-center justify-center transition-colors
              ${slot % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}
              ${highlighted ? 'ring-2 ring-indigo-400 ring-inset' : ''}`}
          >
            {count > 0 && (
              <span className={`text-[9px] font-medium ${count === total ? 'text-white' : 'text-gray-600'}`}>
                {count}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
