'use client';

import { AvailabilityLevel } from '@/lib/types';
import { formatDateCompact } from '@/lib/constants';

const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: 'bg-gray-50',                          // No response yet
  0: 'bg-red-500/15',                          // Unavailable — red tint
  1: 'bg-amber-200',                           // If needed
  2: 'bg-indigo-600/[.47]',                    // Available
};

interface GridCellProps {
  date: string;
  slot: number | string;
  value: AvailabilityLevel | -1;  // -1 = no response
  /** Show a wider cell with date label (for date-only mode) */
  wide?: boolean;
  /** Number of other participants available in this cell */
  overlayCount?: number;
  /** Total number of other participants */
  overlayTotal?: number;
}

export default function GridCell({ date, slot, value, wide, overlayCount, overlayTotal }: GridCellProps) {
  const hasOverlay = overlayCount !== undefined && overlayTotal !== undefined && overlayCount > 0;
  const overlayOpacity = hasOverlay
    ? Math.min(0.3, Math.log(overlayCount + 1) / Math.log(overlayTotal! + 1) * 0.3)
    : 0;

  if (wide) {
    return (
      <div
        data-date={date}
        data-slot={slot}
        className={`relative w-full min-w-[200px] h-[40px] px-3 rounded-lg border border-gray-200 ${CELL_COLORS[value]} transition-colors duration-75 select-none flex items-center justify-between`}
      >
        {hasOverlay && (
          <div
            className="absolute inset-0 rounded-lg bg-indigo-400 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        )}
        <span className="text-sm text-gray-700 relative z-10">{formatDateCompact(date)}</span>
        {hasOverlay && (
          <span className="text-[10px] text-indigo-600 font-medium relative z-10">
            +{overlayCount}
          </span>
        )}
      </div>
    );
  }

  const slotNum = typeof slot === 'number' ? slot : 0;

  return (
    <div
      data-date={date}
      data-slot={slot}
      className={`relative w-[44px] h-[28px] border-r border-gray-200 ${CELL_COLORS[value]} transition-all duration-75 select-none hover:scale-105
        ${slotNum % 2 === 0 ? 'border-t border-gray-300' : 'border-t border-gray-100'}`}
    >
      {hasOverlay && (
        <>
          <div
            className="absolute inset-0 bg-indigo-400 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
          <span className="absolute top-0 right-0.5 text-[8px] text-indigo-500 font-medium leading-[28px] pointer-events-none">
            {overlayCount}
          </span>
        </>
      )}
    </div>
  );
}
