'use client';

import { useState } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';
import GridCell from './GridCell';
import ModeSwitch from './ModeSwitch';
import useGridDrag from './useGridDrag';

interface DragGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
}

export default function DragGrid({
  dates,
  timeStart,
  timeEnd,
  availability,
  onAvailabilityChange,
}: DragGridProps) {
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(2);
  const slots = generateSlots(timeStart, timeEnd);

  const { gridProps } = useGridDrag({
    activeMode,
    availability,
    onAvailabilityChange,
  });

  function getCellValue(date: string, slot: number): AvailabilityLevel | -1 {
    const dateData = availability[date];
    if (!dateData) return -1;
    const val = dateData[String(slot)];
    return val !== undefined ? val : -1;
  }

  return (
    <div className="flex flex-col gap-3">
      <ModeSwitch activeMode={activeMode} onModeChange={setActiveMode} />

      <div className="overflow-x-auto">
        <div className="inline-flex">
          {/* Time labels column */}
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

          {/* Date columns — drag-enabled area */}
          <div className="inline-flex touch-none" {...gridProps}>
            {dates.map((date) => (
              <div key={date} className="flex flex-col">
                <div className="h-[28px] text-xs font-medium text-gray-600 text-center leading-[28px]">
                  {formatDateCompact(date)}
                </div>
                {slots.map((slot) => (
                  <GridCell
                    key={`${date}-${slot}`}
                    date={date}
                    slot={slot}
                    value={getCellValue(date, slot)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
