'use client';

import { useMemo } from 'react';
import { Availability, AvailabilityLevel, EventMode, Participant } from '@/lib/types';
import AvailabilityGrid from '@/components/availability-grid/AvailabilityGrid';
import GridCell from './GridCell';
import CalendarDragGrid from './CalendarDragGrid';
import useGridDrag from './useGridDrag';

interface DragGridProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  participants?: Pick<Participant, 'id' | 'name' | 'availability'>[];
  currentParticipantId?: string | null;
  dateOnly?: boolean;
  eventMode?: EventMode;
  activeMode: AvailabilityLevel;
  onActiveModeChange: (mode: AvailabilityLevel) => void;
  onCellHover?: (date: string | null, slot?: number | string) => void;
}

export default function DragGrid({
  dates,
  timeStart,
  timeEnd,
  availability,
  onAvailabilityChange,
  participants,
  currentParticipantId,
  dateOnly,
  eventMode = 'available',
  activeMode,
  onActiveModeChange,
  onCellHover,
}: DragGridProps) {

  const { gridProps } = useGridDrag({
    activeMode,
    availability,
    onAvailabilityChange,
  });

  // Calculate overlay data: how many OTHER participants are available per cell
  const otherParticipants = useMemo(() => {
    if (!participants || !currentParticipantId) return [];
    return participants.filter((p) => p.id !== currentParticipantId);
  }, [participants, currentParticipantId]);

  const overlayTotal = otherParticipants.length;

  // Pre-compute overlay counts: O(participants × dates × slots) once, then O(1) lookup per cell
  const overlayCountMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const p of otherParticipants) {
      if (!p.availability) continue;
      for (const [date, slots] of Object.entries(p.availability)) {
        if (!map[date]) map[date] = {};
        for (const [slot, val] of Object.entries(slots)) {
          if (val === 2 || val === 1) {
            map[date][slot] = (map[date][slot] || 0) + 1;
          }
        }
      }
    }
    return map;
  }, [otherParticipants]);

  function getOverlayCount(date: string, slot: string): number {
    return overlayCountMap[date]?.[slot] ?? 0;
  }

  function getCellValue(date: string, slot: number | string): AvailabilityLevel | -1 {
    const dateData = availability[date];
    if (!dateData) return -1;
    const val = dateData[String(slot)];
    return val !== undefined ? val : -1;
  }

  if (dateOnly) {
    return (
      <div className="flex flex-col gap-3">
        <CalendarDragGrid
          dates={dates}
          availability={availability}
          onAvailabilityChange={onAvailabilityChange}
          activeMode={activeMode}
          eventMode={eventMode}
          overlayCountMap={overlayCountMap}
          overlayTotal={overlayTotal}
        />
      </div>
    );
  }

  return (
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      columnsProps={gridProps}
      renderCell={(date, slot) => {
        const overlayCount = overlayTotal > 0 ? getOverlayCount(date, String(slot)) : 0;
        return (
          <GridCell
            key={`${date}-${slot}`}
            date={date}
            slot={slot}
            value={getCellValue(date, slot)}
            overlayCount={overlayTotal > 0 ? overlayCount : undefined}
            overlayTotal={overlayTotal > 0 ? overlayTotal : undefined}
            onCellHover={(d, s) => onCellHover?.(d, s)}
            onCellLeave={() => onCellHover?.(null)}
          />
        );
      }}
    />
  );
}
