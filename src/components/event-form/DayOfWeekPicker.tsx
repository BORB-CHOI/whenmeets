'use client';

import { useState } from 'react';

interface DayOfWeekPickerProps {
  selectedDays: string[];
  onDaysChange: (days: string[]) => void;
}

const DAYS_SUN_START = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS_MON_START = ['월', '화', '수', '목', '금', '토', '일'];

// Map Korean day names to a stable key for the dates array
const DAY_KEYS: Record<string, string> = {
  '일': 'sun',
  '월': 'mon',
  '화': 'tue',
  '수': 'wed',
  '목': 'thu',
  '금': 'fri',
  '토': 'sat',
};

export default function DayOfWeekPicker({ selectedDays, onDaysChange }: DayOfWeekPickerProps) {
  const [startOnMonday, setStartOnMonday] = useState(true);
  const days = startOnMonday ? DAYS_MON_START : DAYS_SUN_START;

  function toggleDay(day: string) {
    const key = DAY_KEYS[day];
    if (selectedDays.includes(key)) {
      onDaysChange(selectedDays.filter((d) => d !== key));
    } else {
      onDaysChange([...selectedDays, key]);
    }
  }

  function selectWeekdays() {
    onDaysChange(['mon', 'tue', 'wed', 'thu', 'fri']);
  }

  function selectAll() {
    onDaysChange(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-3">
        {days.map((day) => {
          const key = DAY_KEYS[day];
          const selected = selectedDays.includes(key);
          const isWeekend = day === '토' || day === '일';
          return (
            <button
              type="button"
              key={key}
              onClick={() => toggleDay(day)}
              className={`h-10 rounded-lg text-sm font-medium transition-all cursor-pointer
                ${selected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isWeekend
                    ? 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectWeekdays}
            className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            평일 전체
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer"
          >
            전체 선택
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={startOnMonday}
            onChange={(e) => setStartOnMonday(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 cursor-pointer"
          />
          월요일 시작
        </label>
      </div>
    </div>
  );
}
