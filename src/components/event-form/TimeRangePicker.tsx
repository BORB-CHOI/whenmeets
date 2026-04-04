'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { slotToTime, SLOTS_PER_HOUR } from '@/lib/constants';

interface TimeRangePickerProps {
  timeStart: number;
  timeEnd: number;
  onTimeStartChange: (slot: number) => void;
  onTimeEndChange: (slot: number) => void;
}

function generateTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  // Show options every 30 minutes (every 2 slots at 15-min resolution)
  for (let slot = 0; slot <= 24 * SLOTS_PER_HOUR; slot += 2) {
    options.push({ value: slot, label: slotToTime(slot) });
  }
  return options;
}

function TimeDropdown({
  value,
  onChange,
  disabledCheck,
}: {
  value: number;
  onChange: (v: number) => void;
  disabledCheck: (v: number) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const options = generateTimeOptions();

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Scroll selected into view
  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  const handleSelect = useCallback((v: number) => {
    onChange(v);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-gray-200 rounded-md text-sm bg-white hover:border-gray-300 focus:outline-none focus:border-indigo-600 focus:ring focus:ring-indigo-600/10 transition-all font-mono tabular-nums"
      >
        <span>{selectedLabel}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md py-1 scrollbar-thin"
        >
          {options.map((opt) => {
            const disabled = disabledCheck(opt.value);
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                data-selected={selected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3.5 py-2 text-sm text-left font-mono tabular-nums transition-colors
                  ${selected ? 'bg-indigo-50 text-indigo-700 font-semibold' : ''}
                  ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
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
      <TimeDropdown
        value={timeStart}
        onChange={onTimeStartChange}
        disabledCheck={(v) => v >= timeEnd}
      />
      <span className="text-gray-400 text-sm">~</span>
      <TimeDropdown
        value={timeEnd}
        onChange={onTimeEndChange}
        disabledCheck={(v) => v <= timeStart}
      />
    </div>
  );
}
