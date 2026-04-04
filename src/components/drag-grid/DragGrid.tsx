'use client';

import { useState } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';
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
}

export default function DragGrid({
  dates,
  timeStart,
  timeEnd,
  availability,
  onAvailabilityChange,
}: DragGridProps) {
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(2);

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
    <AvailabilityGrid
      dates={dates}
      timeStart={timeStart}
      timeEnd={timeEnd}
      columnsProps={gridProps}
      header={<ModeSwitch activeMode={activeMode} onModeChange={setActiveMode} />}
      renderCell={(date, slot) => (
        <GridCell
          key={`${date}-${slot}`}
          date={date}
          slot={slot}
          value={getCellValue(date, slot)}
        />
      )}
    />
  );
}
