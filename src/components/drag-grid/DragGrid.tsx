'use client';

import { useMemo, useState } from 'react';
import { Availability, AvailabilityLevel, Participant } from '@/lib/types';
import AvailabilityGrid from '@/components/availability-grid/AvailabilityGrid';
import GridCell from './GridCell';
import ModeSwitch from './ModeSwitch';
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
}: DragGridProps) {
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(2);

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

  function getOverlayCount(date: string, slot: string): number {
    let count = 0;
    for (const p of otherParticipants) {
      const val = p.availability?.[date]?.[slot];
      if (val === 2 || val === 1) count++;
    }
    return count;
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
        <ModeSwitch activeMode={activeMode} onModeChange={setActiveMode} />
        <div className="overflow-x-auto" {...gridProps}>
          <div className="inline-flex flex-col gap-1">
            {dates.map((date) => {
              const slotKey = 'all_day';
              const value = getCellValue(date, slotKey);
              const overlayCount = overlayTotal > 0 ? getOverlayCount(date, slotKey) : 0;
              return (
                <div key={date} className="flex items-center gap-2">
                  <GridCell
                    date={date}
                    slot={slotKey}
                    value={value}
                    wide
                    overlayCount={overlayTotal > 0 ? overlayCount : undefined}
                    overlayTotal={overlayTotal > 0 ? overlayTotal : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      columnsProps={gridProps}
      header={<ModeSwitch activeMode={activeMode} onModeChange={setActiveMode} />}
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
          />
        );
      }}
    />
  );
}
