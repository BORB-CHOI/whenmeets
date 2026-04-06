'use client';

import * as Select from '@radix-ui/react-select';
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

const SLOTS: number[] = (() => {
  const arr: number[] = [];
  for (let slot = 0; slot <= 24 * SLOTS_PER_HOUR; slot += 2) {
    arr.push(slot);
  }
  return arr;
})();

function TimeSelect({
  value,
  onChange,
  disabledCheck,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  disabledCheck: (v: number) => boolean;
  label: string;
}) {
  return (
    <Select.Root
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <Select.Trigger
        aria-label={label}
        className="flex items-center justify-between w-full rounded-md border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 px-3 py-2.5
          text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums
          hover:bg-gray-50 dark:hover:bg-gray-750
          focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500
          transition-colors cursor-pointer"
      >
        <Select.Value />
        <Select.Icon className="ml-2 text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Content
          className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 shadow-lg z-50"
          position="popper"
          sideOffset={4}
          align="center"
        >
          <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-400 cursor-default">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Select.ScrollUpButton>

          <Select.Viewport className="p-1 max-h-50">
            {SLOTS.map((slot) => {
              const disabled = disabledCheck(slot);
              return (
                <Select.Item
                  key={slot}
                  value={String(slot)}
                  disabled={disabled}
                  className="relative flex items-center px-3 py-1.5 text-sm tabular-nums rounded-sm
                    outline-none cursor-pointer select-none
                    data-disabled:text-gray-300 data-disabled:dark:text-gray-600 data-disabled:pointer-events-none
                    data-highlighted:bg-emerald-50 data-highlighted:dark:bg-emerald-900/30
                    data-highlighted:text-emerald-700 data-highlighted:dark:text-emerald-400
                    data-[state=checked]:font-bold data-[state=checked]:text-emerald-700 data-[state=checked]:dark:text-emerald-400
                    text-gray-700 dark:text-gray-300"
                >
                  <Select.ItemText>{formatTime(slot)}</Select.ItemText>
                </Select.Item>
              );
            })}
          </Select.Viewport>

          <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-400 cursor-default">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Select.ScrollDownButton>
        </Select.Content>
    </Select.Root>
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
        <TimeSelect
          value={timeStart}
          onChange={onTimeStartChange}
          disabledCheck={(v) => v >= timeEnd}
          label="시작 시간"
        />
      </div>
      <span className="text-gray-400 dark:text-gray-500 text-sm font-medium shrink-0">~</span>
      <div className="flex-1">
        <TimeSelect
          value={timeEnd}
          onChange={onTimeEndChange}
          disabledCheck={(v) => v <= timeStart}
          label="종료 시간"
        />
      </div>
    </div>
  );
}
