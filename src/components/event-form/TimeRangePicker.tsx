'use client';

import { slotToTime } from '@/lib/constants';

interface TimeRangePickerProps {
  timeStart: number;
  timeEnd: number;
  onTimeStartChange: (slot: number) => void;
  onTimeEndChange: (slot: number) => void;
}

function generateTimeOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  for (let slot = 0; slot <= 48; slot += 2) {
    options.push({ value: slot, label: slotToTime(slot) });
  }
  return options;
}

export default function TimeRangePicker({
  timeStart,
  timeEnd,
  onTimeStartChange,
  onTimeEndChange,
}: TimeRangePickerProps) {
  const options = generateTimeOptions();

  return (
    <div className="flex items-center gap-3">
      <select
        value={timeStart}
        onChange={(e) => onTimeStartChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.value >= timeEnd}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="text-gray-400">~</span>
      <select
        value={timeEnd}
        onChange={(e) => onTimeEndChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.value <= timeStart}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
