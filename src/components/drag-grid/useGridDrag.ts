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
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<Availability>({});
  const erasing = useRef(false);

  function applyToCell(date: string, slot: string) {
    const cellKey = `${date}:${slot}`;
    if (cellKey === lastCell.current) return;
    lastCell.current = cellKey;

    const draft = { ...draftRef.current };
    if (!draft[date]) draft[date] = {};

    if (erasing.current) {
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

  // Interpolate between two points to fill in gaps during fast mouse movement
  function interpolateAndApply(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Sample every 4px to catch small cells
    const steps = Math.max(Math.ceil(dist / 4), 1);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = x1 + dx * t;
      const iy = y1 + dy * t;
      const cell = getCellFromPoint(ix, iy);
      if (cell) applyToCell(cell.date, cell.slot);
    }
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      draftRef.current = JSON.parse(JSON.stringify(availability));
      lastCell.current = null;
      lastPoint.current = { x, y };

      // Toggle: if first cell already matches activeMode, erase instead
      erasing.current = false;
      const cell = getCellFromPoint(x, y);
      if (cell) {
        const existing = availability[cell.date]?.[cell.slot];
        if (existing === activeMode) {
          erasing.current = true;
        }
        applyToCell(cell.date, cell.slot);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMode, availability]
  );

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (!isDragging.current) return;

    // Interpolate from last point to current point to prevent gaps
    if (lastPoint.current) {
      interpolateAndApply(lastPoint.current.x, lastPoint.current.y, x, y);
    } else {
      const cell = getCellFromPoint(x, y);
      if (cell) applyToCell(cell.date, cell.slot);
    }
    lastPoint.current = { x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    isDragging.current = false;
    lastCell.current = null;
    lastPoint.current = null;
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
