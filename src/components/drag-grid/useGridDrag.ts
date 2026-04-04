'use client';

import { useCallback, useRef } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';

interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
}

function getCellFromPoint(x: number, y: number): { date: string; slot: string } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest('[data-date][data-slot]') as HTMLElement | null;
  if (!cell) return null;
  const date = cell.dataset.date!;
  const slot = cell.dataset.slot!;
  return { date, slot };
}

export default function useGridDrag({
  activeMode,
  availability,
  onAvailabilityChange,
}: UseGridDragOptions) {
  const isDragging = useRef(false);
  const lastCell = useRef<string | null>(null);
  const draftRef = useRef<Availability>({});
  const erasing = useRef(false);

  function applyToCell(date: string, slot: string) {
    const cellKey = `${date}:${slot}`;
    if (cellKey === lastCell.current) return;
    lastCell.current = cellKey;

    const draft = { ...draftRef.current };
    if (!draft[date]) draft[date] = {};

    if (activeMode === 0 || erasing.current) {
      const dateCopy = { ...draft[date] };
      delete dateCopy[slot];
      if (Object.keys(dateCopy).length === 0) {
        delete draft[date];
      } else {
        draft[date] = dateCopy;
      }
    } else {
      draft[date] = { ...draft[date], [slot]: activeMode };
    }

    draftRef.current = draft;
    onAvailabilityChange(draft);
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      draftRef.current = JSON.parse(JSON.stringify(availability));
      lastCell.current = null;

      // Toggle: if first cell already matches activeMode, erase instead
      erasing.current = false;
      if (activeMode !== 0) {
        const cell = getCellFromPoint(x, y);
        if (cell) {
          const existing = availability[cell.date]?.[cell.slot];
          if (existing === activeMode) {
            erasing.current = true;
          }
          applyToCell(cell.date, cell.slot);
          return;
        }
      }

      const cell = getCellFromPoint(x, y);
      if (cell) applyToCell(cell.date, cell.slot);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMode, availability]
  );

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (!isDragging.current) return;
    const cell = getCellFromPoint(x, y);
    if (cell) applyToCell(cell.date, cell.slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    isDragging.current = false;
    lastCell.current = null;
    erasing.current = false;
  }, []);

  const gridProps = {
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      handlePointerStart(e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    onMouseUp: () => handlePointerEnd(),
    onMouseLeave: () => handlePointerEnd(),
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    },
    onTouchEnd: () => handlePointerEnd(),
    onTouchCancel: () => handlePointerEnd(),
  };

  return { gridProps };
}
