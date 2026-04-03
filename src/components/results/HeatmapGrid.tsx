'use client';

import { Participant } from '@/lib/types';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';

interface HeatmapGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  participants: Pick<Participant, 'id' | 'name' | 'availability'>[];
  selectedIds: Set<string>;
  includeIfNeeded: boolean;
}

export default function HeatmapGrid({
  dates,
  timeStart,
  timeEnd,
  participants,
  selectedIds,
  includeIfNeeded,
}: HeatmapGridProps) {
  const slots = generateSlots(timeStart, timeEnd);
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

  function getColor(count: number): string {
    if (total === 0 || count === 0) return 'bg-gray-50';
    const ratio = count / total;
    if (ratio <= 0.25) return 'bg-emerald-100';
    if (ratio <= 0.5) return 'bg-emerald-200';
    if (ratio <= 0.75) return 'bg-emerald-400';
    return 'bg-emerald-500';
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex">
        {/* Time labels */}
        <div className="flex flex-col pt-[28px]">
          {slots.map((slot) => (
            <div
              key={slot}
              className="h-[20px] pr-2 text-[10px] text-gray-400 text-right leading-[20px]"
            >
              {slot % 2 === 0 ? slotToTime(slot) : ''}
            </div>
          ))}
        </div>

        {/* Date columns */}
        {dates.map((date) => (
          <div key={date} className="flex flex-col">
            <div className="h-[28px] text-xs font-medium text-gray-600 text-center leading-[28px]">
              {formatDateCompact(date)}
            </div>
            {slots.map((slot) => {
              const count = getCount(date, slot);
              return (
                <div
                  key={`${date}-${slot}`}
                  className={`w-[44px] h-[20px] border-r border-gray-200 ${getColor(count)} flex items-center justify-center transition-colors
                    ${slot % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}
                >
                  {count > 0 && (
                    <span className={`text-[9px] font-medium ${count === total ? 'text-white' : 'text-gray-600'}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
