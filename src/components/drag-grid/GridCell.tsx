'use client';

import { AvailabilityLevel } from '@/lib/types';
import { formatDateCompact } from '@/lib/constants';

export const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: '',                                        // No response yet — transparent
  0: 'bg-red-400/40',                              // Unavailable — soft red
  1: 'bg-amber-200/60',                            // If needed — warm yellow
  2: 'bg-indigo-400/35',                           // Available — soft indigo
};

// Raw CSS values for direct DOM painting during drag (avoids React re-renders)
export const CELL_CSS_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: '',
  0: 'rgba(248,113,113,0.4)',   // red-400/40
  1: 'rgba(253,230,138,0.6)',   // amber-200/60
  2: 'rgba(129,140,248,0.35)',  // indigo-400/35
};

interface GridCellProps {
  date: string;
  slot: number | string;
  value: AvailabilityLevel | -1;
  wide?: boolean;
  overlayCount?: number;
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
        className={`relative w-full min-w-[200px] h-[40px] px-3 rounded-lg border border-gray-200 ${CELL_COLORS[value]} transition-colors duration-75 select-none cursor-pointer flex items-center justify-between`}
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

  return (
    <div
      data-date={date}
      data-slot={slot}
      className={`relative w-full h-full ${CELL_COLORS[value]} transition-colors duration-75 select-none cursor-pointer`}
    >
      {hasOverlay && (
        <>
          <div
            className="absolute inset-0 bg-indigo-400 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
          <span className="absolute top-0 right-0.5 text-[7px] text-indigo-500 font-medium leading-[15px] pointer-events-none">
            {overlayCount}
          </span>
        </>
      )}
    </div>
  );
}
