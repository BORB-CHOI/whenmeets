'use client';

import { AvailabilityLevel } from '@/lib/types';

const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: 'bg-gray-50',         // No response yet
  0: 'bg-gray-50',            // Unavailable (same as empty — eraser resets)
  1: 'bg-amber-300',          // If needed
  2: 'bg-emerald-400',        // Available
};

interface GridCellProps {
  date: string;
  slot: number;
  value: AvailabilityLevel | -1;  // -1 = no response
}

export default function GridCell({ date, slot, value }: GridCellProps) {
  return (
    <div
      data-date={date}
      data-slot={slot}
      className={`w-[44px] h-[20px] border-r border-gray-200 ${CELL_COLORS[value]} transition-colors duration-75 select-none
        ${slot % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}
    />
  );
}
