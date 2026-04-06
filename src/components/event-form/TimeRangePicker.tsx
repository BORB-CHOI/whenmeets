'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SLOTS_PER_HOUR } from '@/lib/constants';

interface TimeRangePickerProps {
  timeStart: number;
  timeEnd: number;
  onTimeStartChange: (slot: number) => void;
  onTimeEndChange: (slot: number) => void;
}

function formatTime(slot: number): string {
  const h = Math.floor(slot / SLOTS_PER_HOUR);
  const m = (slot % SLOTS_PER_HOUR) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateOptions(): number[] {
  const opts: number[] = [];
  for (let slot = 0; slot <= 24 * SLOTS_PER_HOUR; slot += 2) {
    opts.push(slot);
  }
  return opts;
}

const ITEM_H = 36;
const VISIBLE = 5;

function ScrollPicker({
  value,
  onChange,
  disabledCheck,
}: {
  value: number;
  onChange: (v: number) => void;
  disabledCheck: (v: number) => boolean;
}) {
  const options = generateOptions();
  const containerRef = useRef<HTMLDivElement>(null);

  // When true, the value-sync useEffect is suppressed to avoid fighting
  // with an ongoing internal scroll (drag / wheel / click).
  const internalAction = useRef(false);

  // Refs for latest props so window-level listeners don't hold stale closures
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const disabledCheckRef = useRef(disabledCheck);
  disabledCheckRef.current = disabledCheck;

  // ── helpers ──────────────────────────────────────────────────────────

  const scrollToIdx = useCallback((idx: number, smooth: boolean) => {
    containerRef.current?.scrollTo({
      top: idx * ITEM_H,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  /** Snap to the nearest option, call onChange, suppress value-sync for 300ms */
  function commitScroll() {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, options.length - 1));
    scrollToIdx(clamped, true);
    const opt = options[clamped];
    if (!disabledCheckRef.current(opt)) {
      onChangeRef.current(opt);
    }
    internalAction.current = true;
    setTimeout(() => { internalAction.current = false; }, 300);
  }

  /** Move exactly N steps from current position */
  function moveBySteps(steps: number) {
    if (!containerRef.current) return;
    const currentIdx = Math.round(containerRef.current.scrollTop / ITEM_H);
    const nextIdx = Math.max(0, Math.min(currentIdx + steps, options.length - 1));
    if (nextIdx === currentIdx) return;
    scrollToIdx(nextIdx, true);
    const opt = options[nextIdx];
    if (!disabledCheckRef.current(opt)) {
      onChangeRef.current(opt);
    }
    internalAction.current = true;
    setTimeout(() => { internalAction.current = false; }, 300);
  }

  // ── value sync (external changes only) ──────────────────────────────

  useEffect(() => {
    if (internalAction.current) return;
    const idx = options.indexOf(value);
    if (idx !== -1) scrollToIdx(idx, false);
  }, [value, options, scrollToIdx]);

  // ── mouse drag ──────────────────────────────────────────────────────

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragScrollTop = useRef(0);

  function handleMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    internalAction.current = true;
    dragStartY.current = e.clientY;
    dragScrollTop.current = containerRef.current?.scrollTop ?? 0;
    e.preventDefault();
    e.stopPropagation();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      e.preventDefault();
      containerRef.current.scrollTop = dragScrollTop.current + (dragStartY.current - e.clientY);
    }
    function onMouseUp(e: MouseEvent) {
      if (!isDragging.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = false;
      commitScroll();
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, true);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── native scroll snap (touch momentum / programmatic) ─────────────

  const snapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleScroll() {
    if (!containerRef.current || isDragging.current || wheelBusy.current) return;
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!containerRef.current || isDragging.current) return;
      commitScroll();
    }, 120);
  }

  // ── wheel ───────────────────────────────────────────────────────────
  //
  // Strategy: always move exactly 1 step per wheel "click".
  // Block further input until the smooth-scroll animation finishes (~200ms).
  // This works for mouse wheels, trackpads, and high-precision mice because
  // we ignore deltaY magnitude entirely — direction only.

  const wheelBusy = useRef(false);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (wheelBusy.current || !containerRef.current) return;

    const direction = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
    if (direction === 0) return;

    wheelBusy.current = true;
    moveBySteps(direction);

    // Unblock after smooth scroll settles
    setTimeout(() => { wheelBusy.current = false; }, 200);
  }

  // ── render ──────────────────────────────────────────────────────────

  const halfPad = Math.floor(VISIBLE / 2);

  return (
    <div
      className="relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800"
      style={{ height: ITEM_H * VISIBLE }}
    >
      {/* Center highlight bar */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-y border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/30 z-10"
        style={{ top: ITEM_H * halfPad, height: ITEM_H }}
      />
      {/* Fade top/bottom */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white dark:from-gray-800 to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-20" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        className="h-full overflow-y-auto select-none"
        style={{
          scrollbarWidth: 'none',
          paddingTop: ITEM_H * halfPad,
          paddingBottom: ITEM_H * halfPad,
          cursor: 'grab',
        }}
      >
        {options.map((opt) => {
          const disabled = disabledCheck(opt);
          const selected = opt === value;
          return (
            <div
              key={opt}
              onClick={() => {
                if (disabled) return;
                internalAction.current = true;
                onChange(opt);
                const idx = options.indexOf(opt);
                scrollToIdx(idx, true);
                setTimeout(() => { internalAction.current = false; }, 300);
              }}
              className={`flex items-center justify-center cursor-pointer transition-colors
                ${disabled ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed' : ''}
                ${selected ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''}
                ${!selected && !disabled ? 'text-gray-500 dark:text-gray-400' : ''}`}
              style={{
                height: ITEM_H,
                fontSize: selected ? 16 : 14,
              }}
            >
              {formatTime(opt)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TimeRangePicker({
  timeStart,
  timeEnd,
  onTimeStartChange,
  onTimeEndChange,
}: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <ScrollPicker
          value={timeStart}
          onChange={onTimeStartChange}
          disabledCheck={(v) => v >= timeEnd}
        />
      </div>
      <span className="text-gray-400 text-sm font-medium">~</span>
      <div className="flex-1">
        <ScrollPicker
          value={timeEnd}
          onChange={onTimeEndChange}
          disabledCheck={(v) => v <= timeStart}
        />
      </div>
    </div>
  );
}
