'use client';

import { AvailabilityLevel } from '@/lib/types';
import { formatDateCompact } from '@/lib/constants';

export const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: '',                                        // No response yet — transparent
  0: 'bg-red-400/50',                              // Unavailable — red
  1: 'bg-amber-300/50',                            // If needed — yellow
  2: 'bg-emerald-400/60',                          // Available — strong emerald (my selection)
};

// Raw CSS values for direct DOM painting during drag (avoids React re-renders)
export const CELL_CSS_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: '',
  0: 'rgba(248,113,113,0.5)',   // red-400/50
  1: 'rgba(252,211,77,0.5)',    // amber-300/50
  2: 'rgba(52,211,153,0.6)',    // emerald-400/60
};

interface GridCellProps {
  date: string;
  slot: number | string;
  value: AvailabilityLevel | -1;
  wide?: boolean;
  overlayCount?: number;
  overlayTotal?: number;
  onCellHover?: (date: string, slot: number | string) => void;
  onCellLeave?: () => void;
}

export default function GridCell({ date, slot, value, wide, overlayCount, overlayTotal, onCellHover, onCellLeave }: GridCellProps) {
  const hasOverlay = overlayCount !== undefined && overlayTotal !== undefined && overlayCount > 0;
  // Border opacity: 0.2 ~ 0.8 based on how many others responded
  const borderOpacity = hasOverlay
    ? Math.min(0.8, 0.2 + (overlayCount! / overlayTotal!) * 0.6)
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
            className="absolute inset-0 rounded-lg bg-emerald-400 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        )}
        <span className="text-sm text-gray-700 relative z-10">{formatDateCompact(date)}</span>
        {hasOverlay && (
          <span className="text-[10px] text-emerald-600 font-medium relative z-10">
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
      onMouseEnter={() => onCellHover?.(date, slot)}
      onMouseLeave={() => onCellLeave?.()}
    >
      {/* Overlay: inset outline indicating other participants (no fill, no overlap) */}
      {hasOverlay && (
        <div
          className="absolute inset-0.5 pointer-events-none rounded-sm"
          style={{
            outline: `1.5px dashed rgba(5,150,105,${borderOpacity})`,
            outlineOffset: '-1px',
          }}
        />
      )}
      {hasOverlay && overlayCount! > 0 && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold pointer-events-none select-none"
          style={{ color: `rgba(5,150,105,${Math.min(1, borderOpacity + 0.2)})` }}
        >
          {overlayCount}
        </span>
      )}
    </div>
  );
}
