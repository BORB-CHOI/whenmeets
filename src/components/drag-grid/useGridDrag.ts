'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Availability, AvailabilityLevel } from '@/lib/types';
import { CELL_CSS_COLORS } from './GridCell';

interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  onDragEnd?: (availability: Availability) => void;
  disabled?: boolean;
}

interface CellCoord {
  date: string;
  slot: string;
  dateIdx: number;
  slotIdx: number;
}

function getCellFromPoint(x: number, y: number, container?: HTMLElement | null): CellCoord | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (container && !container.contains(el)) return null;
  const cell = el.closest('[data-date][data-slot]') as HTMLElement | null;
  if (!cell) return null;
  const date = cell.dataset.date!;
  const slot = cell.dataset.slot!;
  const dateIdx = Number(cell.dataset.dateIdx ?? -1);
  const slotIdx = Number(cell.dataset.slotIdx ?? -1);
  return { date, slot, dateIdx, slotIdx };
}

export default function useGridDrag({
  activeMode,
  availability,
  onAvailabilityChange,
  onDragEnd,
  disabled = false,
}: UseGridDragOptions) {
  const isDragging = useRef(false);
  const startCell = useRef<CellCoord | null>(null);
  const draftRef = useRef<Availability>({});
  const baselineRef = useRef<Availability>({});
  const erasing = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const paintedKeys = useRef<Set<string>>(new Set());
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);
  onAvailabilityChangeRef.current = onAvailabilityChange;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  function paintCell(date: string, slot: string, mode: 'apply' | 'erase' | 'reset') {
    const cellEl = containerRef.current?.querySelector(
      `[data-date="${date}"][data-slot="${slot}"]`,
    ) as HTMLElement | null;
    if (!cellEl) return;
    if (mode === 'reset') {
      const baseVal = baselineRef.current[date]?.[slot];
      if (baseVal === undefined) {
        cellEl.style.backgroundColor = '';
        delete cellEl.dataset.erased;
      } else {
        cellEl.style.backgroundColor = CELL_CSS_COLORS[baseVal];
        delete cellEl.dataset.erased;
      }
    } else if (mode === 'erase') {
      cellEl.style.backgroundColor = 'white';
      cellEl.dataset.erased = '1';
    } else {
      cellEl.style.backgroundColor = CELL_CSS_COLORS[activeMode];
      delete cellEl.dataset.erased;
    }
  }

  function applyRectangle(start: CellCoord, end: CellCoord) {
    if (!containerRef.current) return;
    const minDate = Math.min(start.dateIdx, end.dateIdx);
    const maxDate = Math.max(start.dateIdx, end.dateIdx);
    const minSlot = Math.min(start.slotIdx, end.slotIdx);
    const maxSlot = Math.max(start.slotIdx, end.slotIdx);

    // Reset draft to baseline (snapshot taken at drag start)
    const draft: Availability = {};
    for (const d in baselineRef.current) {
      draft[d] = { ...baselineRef.current[d] };
    }

    // Reset previously painted cells back to baseline
    paintedKeys.current.forEach((key) => {
      const [date, slot] = key.split('|');
      paintCell(date, slot, 'reset');
    });
    const newPainted = new Set<string>();

    // Iterate over all cells in container with index in range
    const cells = containerRef.current.querySelectorAll('[data-date][data-slot]');
    cells.forEach((node) => {
      const el = node as HTMLElement;
      const dIdx = Number(el.dataset.dateIdx ?? -1);
      const sIdx = Number(el.dataset.slotIdx ?? -1);
      if (dIdx < minDate || dIdx > maxDate || sIdx < minSlot || sIdx > maxSlot) return;

      const date = el.dataset.date!;
      const slot = el.dataset.slot!;

      if (erasing.current) {
        if (draft[date]) {
          delete draft[date][slot];
          if (Object.keys(draft[date]).length === 0) delete draft[date];
        }
        paintCell(date, slot, 'erase');
      } else {
        if (!draft[date]) draft[date] = {};
        draft[date][slot] = activeMode;
        paintCell(date, slot, 'apply');
      }
      newPainted.add(`${date}|${slot}`);
    });

    paintedKeys.current = newPainted;
    draftRef.current = draft;
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      const cell = getCellFromPoint(x, y, containerRef.current);
      if (!cell || cell.dateIdx < 0 || cell.slotIdx < 0) return;

      isDragging.current = true;
      startCell.current = cell;
      paintedKeys.current = new Set();

      // Snapshot baseline (state before drag)
      const baseline: Availability = {};
      for (const d in availability) {
        baseline[d] = { ...availability[d] };
      }
      baselineRef.current = baseline;

      // Toggle: if anchor cell already matches activeMode, the rectangle erases
      const existing = availability[cell.date]?.[cell.slot];
      erasing.current = existing === activeMode;

      applyRectangle(cell, cell);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMode, availability],
  );

  const handlePointerMove = useCallback((x: number, y: number) => {
    if (!isDragging.current || !startCell.current) return;
    const cell = getCellFromPoint(x, y, containerRef.current);
    if (!cell || cell.dateIdx < 0 || cell.slotIdx < 0) return;
    applyRectangle(startCell.current, cell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    if (isDragging.current) {
      // Clear all inline styles within the container so React takes back control
      containerRef.current?.querySelectorAll('[data-date][data-slot]').forEach((el) => {
        (el as HTMLElement).style.backgroundColor = '';
        delete (el as HTMLElement).dataset.erased;
      });
      const committed = { ...draftRef.current };
      onAvailabilityChangeRef.current(committed);
      onDragEndRef.current?.(committed);
    }
    isDragging.current = false;
    startCell.current = null;
    paintedKeys.current = new Set();
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

  // rAF throttle for pointer move
  const rafId = useRef(0);

  // Native touchmove listener with { passive: false } to allow preventDefault.
  // React's synthetic onTouchMove is passive by default, which causes
  // "Unable to preventDefault inside passive event listener invocation" errors.
  useEffect(() => {
    if (!containerEl) return;

    function onTouchMoveNative(e: TouchEvent) {
      if (disabled) return;
      if (!isDragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const { clientX, clientY } = touch;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        handlePointerMove(clientX, clientY);
      });
    }

    containerEl.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => {
      containerEl.removeEventListener('touchmove', onTouchMoveNative);
    };
  }, [containerEl, disabled, handlePointerMove]);

  const gridProps = {
    ref: (el: HTMLElement | null) => {
      containerRef.current = el;
      setContainerEl(el);
    },
    onMouseDown: (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      handlePointerStart(e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (disabled) return;
      if (!isDragging.current) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        handlePointerMove(clientX, clientY);
      });
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY);
    },
    // touchmove is attached natively in useEffect above with { passive: false }
  };

  return { gridProps };
}
