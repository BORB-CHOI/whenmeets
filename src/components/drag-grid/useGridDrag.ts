'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Availability, AvailabilityLevel, EventMode } from '@/lib/types';
import { getCellCssColor } from './GridCell';

interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  onDragEnd?: (availability: Availability) => void;
  eventMode: EventMode;
  disabled?: boolean;
}

interface CellCoord {
  date: string;
  slot: string;
  dateIdx: number;
  slotIdx: number;
}

interface CellEntry extends CellCoord {
  el: HTMLElement;
}

type PaintMode = 'apply' | 'erase' | 'reset';

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
  eventMode,
  disabled = false,
}: UseGridDragOptions) {
  const isDragging = useRef(false);
  const startCell = useRef<CellCoord | null>(null);
  const draftRef = useRef<Availability>({});
  const baselineRef = useRef<Availability>({});
  const erasing = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);
  const cellEntriesRef = useRef<CellEntry[]>([]);
  const cellByKeyRef = useRef<Map<string, CellEntry>>(new Map());
  const cellByCoordRef = useRef<Map<string, CellEntry>>(new Map());
  const paintedKeys = useRef<Set<string>>(new Set());
  const lastEndKey = useRef('');
  const lastTouchEndAt = useRef(0);
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);
  onAvailabilityChangeRef.current = onAvailabilityChange;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  function rebuildCellCache() {
    const entries: CellEntry[] = [];
    const byKey = new Map<string, CellEntry>();
    const byCoord = new Map<string, CellEntry>();
    containerRef.current?.querySelectorAll('[data-date][data-slot]').forEach((node) => {
      const el = node as HTMLElement;
      const date = el.dataset.date;
      const slot = el.dataset.slot;
      if (!date || !slot) return;

      const entry = {
        el,
        date,
        slot,
        dateIdx: Number(el.dataset.dateIdx ?? -1),
        slotIdx: Number(el.dataset.slotIdx ?? -1),
      };
      entries.push(entry);
      byKey.set(`${date}|${slot}`, entry);
      byCoord.set(`${entry.dateIdx}|${entry.slotIdx}`, entry);
    });

    cellEntriesRef.current = entries;
    cellByKeyRef.current = byKey;
    cellByCoordRef.current = byCoord;
  }

  function paintCell(key: string, mode: PaintMode) {
    const cell = cellByKeyRef.current.get(key);
    if (!cell) return;
    const cellEl = cell.el;
    if (mode === 'reset') {
      const baseVal = baselineRef.current[cell.date]?.[cell.slot];
      cellEl.style.backgroundColor = '';
      delete cellEl.dataset.erased;
      void baseVal;
    } else if (mode === 'erase') {
      cellEl.style.backgroundColor = getCellCssColor(-1, eventMode);
      cellEl.dataset.erased = '1';
    } else {
      cellEl.style.backgroundColor = getCellCssColor(activeMode, eventMode);
      delete cellEl.dataset.erased;
    }
  }

  function resetDraftCellToBaseline(key: string) {
    const cell = cellByKeyRef.current.get(key);
    if (!cell) return;
    const baseVal = baselineRef.current[cell.date]?.[cell.slot];
    if (baseVal === undefined) {
      if (draftRef.current[cell.date]) {
        delete draftRef.current[cell.date][cell.slot];
        if (Object.keys(draftRef.current[cell.date]).length === 0) {
          delete draftRef.current[cell.date];
        }
      }
      return;
    }

    if (!draftRef.current[cell.date]) draftRef.current[cell.date] = {};
    draftRef.current[cell.date][cell.slot] = baseVal;
  }

  function applyDraftCell(key: string) {
    const cell = cellByKeyRef.current.get(key);
    if (!cell) return;

    if (erasing.current) {
      if (draftRef.current[cell.date]) {
        delete draftRef.current[cell.date][cell.slot];
        if (Object.keys(draftRef.current[cell.date]).length === 0) {
          delete draftRef.current[cell.date];
        }
      }
      return;
    }

    if (!draftRef.current[cell.date]) draftRef.current[cell.date] = {};
    draftRef.current[cell.date][cell.slot] = activeMode;
  }

  function getRectangleKeys(start: CellCoord, end: CellCoord) {
    const minDate = Math.min(start.dateIdx, end.dateIdx);
    const maxDate = Math.max(start.dateIdx, end.dateIdx);
    const minSlot = Math.min(start.slotIdx, end.slotIdx);
    const maxSlot = Math.max(start.slotIdx, end.slotIdx);
    const keys = new Set<string>();

    for (let dateIdx = minDate; dateIdx <= maxDate; dateIdx++) {
      for (let slotIdx = minSlot; slotIdx <= maxSlot; slotIdx++) {
        const cell = cellByCoordRef.current.get(`${dateIdx}|${slotIdx}`);
        if (cell) keys.add(`${cell.date}|${cell.slot}`);
      }
    }

    return keys;
  }

  function applyRectangle(start: CellCoord, end: CellCoord) {
    if (!containerRef.current) return;

    const nextKeys = getRectangleKeys(start, end);
    const prevKeys = paintedKeys.current;

    for (const key of prevKeys) {
      if (nextKeys.has(key)) continue;
      resetDraftCellToBaseline(key);
      paintCell(key, 'reset');
    }

    const paintMode: PaintMode = erasing.current ? 'erase' : 'apply';
    for (const key of nextKeys) {
      if (prevKeys.has(key)) continue;
      applyDraftCell(key);
      paintCell(key, paintMode);
    }

    paintedKeys.current = nextKeys;
  }

  const handlePointerStart = useCallback(
    (x: number, y: number) => {
      if (isDragging.current) return;
      const cell = getCellFromPoint(x, y, containerRef.current);
      if (!cell || cell.dateIdx < 0 || cell.slotIdx < 0) return;

      isDragging.current = true;
      if (containerRef.current) containerRef.current.dataset.dragging = 'true';
      startCell.current = cell;
      paintedKeys.current = new Set();
      lastEndKey.current = '';
      rebuildCellCache();

      // Snapshot baseline (state before drag)
      const baseline: Availability = {};
      for (const d in availability) {
        baseline[d] = { ...availability[d] };
      }
      baselineRef.current = baseline;
      draftRef.current = {};
      for (const d in baseline) {
        draftRef.current[d] = { ...baseline[d] };
      }

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
    const endKey = `${cell.dateIdx}|${cell.slotIdx}`;
    if (lastEndKey.current === endKey) return;
    lastEndKey.current = endKey;
    applyRectangle(startCell.current, cell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  const handlePointerEnd = useCallback(() => {
    if (isDragging.current) {
      // Clear all inline styles within the container so React takes back control
      paintedKeys.current.forEach((key) => {
        const cell = cellByKeyRef.current.get(key);
        if (!cell) return;
        cell.el.style.backgroundColor = '';
        delete cell.el.dataset.erased;
      });
      const committed = { ...draftRef.current };
      onAvailabilityChangeRef.current(committed);
      onDragEndRef.current?.(committed);
    }
    isDragging.current = false;
    if (containerRef.current) delete containerRef.current.dataset.dragging;
    startCell.current = null;
    paintedKeys.current = new Set();
    lastEndKey.current = '';
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
      if (el) {
        requestAnimationFrame(rebuildCellCache);
      } else {
        cellEntriesRef.current = [];
        cellByKeyRef.current = new Map();
        cellByCoordRef.current = new Map();
      }
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
