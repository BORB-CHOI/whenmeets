'use client';

import { memo } from 'react';
import { AvailabilityLevel, EventMode } from '@/lib/types';
import { formatDateCompact } from '@/lib/constants';

export function getCellColorClass(
  value: AvailabilityLevel | -1,
  eventMode: EventMode,
): string {
  if (eventMode === 'unavailable') {
    if (value === -1) return 'bg-teal-600/[.47]';
    if (value === 0) return 'bg-[#FAD3D3]';
    return '';
  }
  if (value === -1 || value === 0) return 'bg-[#FAD3D3]';
  if (value === 1) return 'bg-[#FFE8B8]';
  if (value === 2) return 'bg-teal-600/[.47]';
  return '';
}

export function getCellCssColor(
  value: AvailabilityLevel | -1,
  eventMode: EventMode,
): string {
  if (eventMode === 'unavailable') {
    if (value === -1) return 'rgba(0,172,193,0.47)';
    if (value === 0) return '#FAD3D3';
    return '';
  }
  if (value === -1 || value === 0) return '#FAD3D3';
  if (value === 1) return '#FFE8B8';
  if (value === 2) return 'rgba(0,172,193,0.47)';
  return '';
}

interface GridCellProps {
  date: string;
  slot: number | string;
  value: AvailabilityLevel | -1;
  eventMode: EventMode;
  wide?: boolean;
  overlayCount?: number;
  overlayTotal?: number;
  dateIdx?: number;
  slotIdx?: number;
  onCellHover?: (date: string, slot: number | string) => void;
  onCellLeave?: () => void;
}

function GridCell({ date, slot, value, eventMode, wide, overlayCount, overlayTotal, dateIdx, slotIdx, onCellHover, onCellLeave }: GridCellProps) {
  const hasOverlay = overlayCount !== undefined && overlayTotal !== undefined && overlayCount > 0;
  const borderOpacity = hasOverlay ? 0.2 : 0;
  const numberOpacity = hasOverlay
    ? Math.min(0.85, 0.45 + (overlayCount! / overlayTotal!) * 0.4)
    : 0;
  const overlayOpacity = hasOverlay
    ? Math.min(0.5, 0.1 + (overlayCount! / overlayTotal!) * 0.4)
    : 0;

  const colorClass = getCellColorClass(value, eventMode);

  if (wide) {
    return (
      <div
        data-date={date}
        data-slot={slot}
        data-date-idx={dateIdx}
        data-slot-idx={slotIdx}
        className={`relative w-full min-w-[200px] h-[40px] px-3 rounded-lg border border-gray-200 ${colorClass} select-none cursor-pointer flex items-center justify-between`}
      >
        {hasOverlay && (
          <div
            className="absolute inset-0 rounded-lg bg-teal-600 pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        )}
        <span className="text-sm text-gray-700 relative z-10">{formatDateCompact(date)}</span>
        {hasOverlay && (
          <span className="text-[10px] text-teal-600 font-medium relative z-10">
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
      data-date-idx={dateIdx}
      data-slot-idx={slotIdx}
      className={`relative w-full h-full ${colorClass} select-none cursor-pointer`}
      onMouseEnter={() => onCellHover?.(date, slot)}
      onMouseLeave={() => onCellLeave?.()}
    >
      {hasOverlay && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            outline: `1.5px dashed rgba(0,172,193,${borderOpacity})`,
            outlineOffset: '-1.5px',
          }}
        />
      )}
      {hasOverlay && overlayCount! > 0 && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold pointer-events-none select-none z-20"
          style={{ color: `rgba(0,172,193,${numberOpacity})` }}
        >
          {overlayCount}
        </span>
      )}
    </div>
  );
}

export default memo(GridCell);
