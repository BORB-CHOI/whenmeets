'use client';

import { ReactNode } from 'react';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';

interface AvailabilityGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  /** Render a single cell given a date and slot index */
  renderCell: (date: string, slot: number) => ReactNode;
  /** Optional extra props on the date columns container (e.g. drag handlers) */
  columnsProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Content rendered above the grid (e.g. ModeSwitch) */
  header?: ReactNode;
}

export default function AvailabilityGrid({
  dates,
  timeStart,
  timeEnd,
  renderCell,
  columnsProps,
  header,
}: AvailabilityGridProps) {
  const slots = generateSlots(timeStart, timeEnd);

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="overflow-x-auto">
        <div className="inline-flex">
          {/* Time labels column */}
          <div className="flex flex-col pt-7">
            {slots.map((slot) => (
              <div
                key={slot}
                className="h-3.5 pr-2 text-[10px] text-gray-400 text-right leading-3.5 font-mono tabular-nums"
              >
                {slot % 4 === 0 ? slotToTime(slot) : ''}
              </div>
            ))}
          </div>

          {/* Date columns */}
          <div className={`inline-flex${columnsProps ? ' touch-none' : ''}`} {...columnsProps}>
            {dates.map((date) => (
              <div key={date} className="flex flex-col">
                <div className="h-7 text-xs font-medium text-gray-600 text-center leading-7">
                  {formatDateCompact(date)}
                </div>
                {slots.map((slot) => (
                  <div key={`${date}-${slot}`}>
                    {renderCell(date, slot)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
