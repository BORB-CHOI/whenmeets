'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';
import { CELL_CSS_COLORS } from './GridCell';

interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  onDragEnd?: (availability: Availability) => void;
}

function getCellFromPoint(x: number, y: number, container?: HTMLElement | null): { date: string; slot: string } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  // Scope to grid container to avoid matching cells in other grids
  if (container && !container.contains(el)) return null;
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
  onDragEnd,
}: UseGridDragOptions) {
  const isDragging = useRef(false);
  const lastCell = useRef<string | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<Availability>({});
  const erasing = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);
  onAvailabilityChangeRef.current = onAvailabilityChange;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  function applyToCell(date: string, slot: string) {
    const cellKey = `${date}:${slot}`;
    if (cellKey === lastCell.current) return;
    lastCell.current = cellKey;

    const draft = draftRef.current;
    if (!draft[date]) draft[date] = {};

    if (erasing.current) {
      delete draft[date][slot];
      if (Object.keys(draft[date]).length === 0) delete draft[date];
    } else {
      draft[date][slot] = activeMode;
    }

    // Paint DOM directly instead of triggering React re-render
    const cellEl = containerRef.current?.querySelector(`[data-date="${date}"][data-slot="${slot}"]`) as HTMLElement | null;
    if (cellEl) {
      if (erasing.current) {
        cellEl.style.backgroundColor = 'white';
        cellEl.dataset.erased = '1';
      } else {
        cellEl.style.backgroundColor = CELL_CSS_COLORS[activeMode];
        delete cellEl.dataset.erased;
      }
    }
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
      const cell = getCellFromPoint(ix, iy, containerRef.current);
      if (cell) applyToCell(cell.date, cell.slot);
    }
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      // Shallow clone for draft — mutated during drag, committed on end
      const clone: Availability = {};
      for (const d in availability) {
        clone[d] = { ...availability[d] };
      }
      draftRef.current = clone;
      lastCell.current = null;
      lastPoint.current = { x, y };

      // Toggle: if first cell already matches activeMode, erase instead
      erasing.current = false;
      const cell = getCellFromPoint(x, y, containerRef.current);
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
      const cell = getCellFromPoint(x, y, containerRef.current);
      if (cell) applyToCell(cell.date, cell.slot);
    }
    lastPoint.current = { x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    if (isDragging.current) {
      // Clear all inline styles within the container so React takes back control
      containerRef.current?.querySelectorAll('[data-date][data-slot]').forEach((el) => {
        (el as HTMLElement).style.backgroundColor = '';
        delete (el as HTMLElement).dataset.erased;
      });
      // Commit draft to React state once on drag end
      const committed = { ...draftRef.current };
      onAvailabilityChangeRef.current(committed);
      onDragEndRef.current?.(committed);
    }
    isDragging.current = false;
    lastCell.current = null;
    lastPoint.current = null;
    erasing.current = false;
  }, []);

  // Window-level listeners so dragging doesn't break when pointer leaves the grid
  useEffect(() => {
    function onWindowPointerUp() {
      if (isDragging.current) handlePointerEnd();
    }
    window.addEventListener('mouseup', onWindowPointerUp);
    window.addEventListener('touchend', onWindowPointerUp);
    window.addEventListener('touchcancel', onWindowPointerUp);
    return () => {
      window.removeEventListener('mouseup', onWindowPointerUp);
      window.removeEventListener('touchend', onWindowPointerUp);
      window.removeEventListener('touchcancel', onWindowPointerUp);
    };
  }, [handlePointerEnd]);

  const gridProps = {
    ref: (el: HTMLElement | null) => { containerRef.current = el; },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      handlePointerStart(e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    },
    // No onMouseUp/onMouseLeave — handled by window listeners
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    },
    // No onTouchEnd/onTouchCancel — handled by window listeners
  };

  return { gridProps };
}
