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
  const isScrolling = useRef(false);

  // Mouse drag scrolling (window-level so drag works outside container)
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragScrollTop = useRef(0);

  function handleMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragScrollTop.current = containerRef.current?.scrollTop ?? 0;
    e.preventDefault();
    e.stopPropagation();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      e.preventDefault();
      const dy = dragStartY.current - e.clientY;
      containerRef.current.scrollTop = dragScrollTop.current + dy;
    }
    function onMouseUp(e: MouseEvent) {
      if (isDragging.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      isDragging.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, true); // capture phase to prevent modal close
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp, true);
    };
  }, []);

  const scrollToValue = useCallback((v: number, smooth = false) => {
    const idx = options.indexOf(v);
    if (idx === -1 || !containerRef.current) return;
    const top = idx * ITEM_H;
    containerRef.current.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }, [options]);

  useEffect(() => {
    scrollToValue(value);
  }, [value, scrollToValue]);

  function handleScroll() {
    if (!containerRef.current) return;
    isScrolling.current = true;

    // Debounce: snap to nearest after scroll stops
    clearTimeout((containerRef.current as any)._snapTimer);
    (containerRef.current as any)._snapTimer = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, options.length - 1));
      const opt = options[clamped];
      if (!disabledCheck(opt)) {
        onChange(opt);
      }
      containerRef.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
      isScrolling.current = false;
    }, 80);
  }

  const halfPad = Math.floor(VISIBLE / 2);

  return (
    <div
      className="relative rounded-lg border border-gray-200 overflow-hidden bg-white"
      style={{ height: ITEM_H * VISIBLE }}
    >
      {/* Center highlight bar */}
      <div
        className="absolute left-0 right-0 pointer-events-none border-y border-indigo-200 bg-indigo-50/50 z-10"
        style={{ top: ITEM_H * halfPad, height: ITEM_H }}
      />
      {/* Fade top/bottom */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
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
              onClick={() => { if (!disabled) { onChange(opt); scrollToValue(opt, true); } }}
              className={`flex items-center justify-center cursor-pointer transition-colors
                ${disabled ? 'text-gray-200 cursor-not-allowed' : ''}
                ${selected ? 'text-indigo-700 font-bold' : ''}
                ${!selected && !disabled ? 'text-gray-500' : ''}`}
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
