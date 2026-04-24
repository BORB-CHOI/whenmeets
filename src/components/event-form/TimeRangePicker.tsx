'use client';

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
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
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SLOTS.map((slot) => (
          <SelectItem
            key={slot}
            value={String(slot)}
            disabled={disabledCheck(slot)}
          >
            {formatTime(slot)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
