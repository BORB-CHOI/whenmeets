'use client';

import { useState } from 'react';

interface DatePickerProps {
  selectedDates: string[];
  onDatesChange: (dates: string[]) => void;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function DatePicker({ selectedDates, onDatesChange }: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  function toggleDate(dateStr: string) {
    if (selectedDates.includes(dateStr)) {
      onDatesChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onDatesChange([...selectedDates, dateStr].sort());
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const todayStr = formatDateISO(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          &larr;
        </button>
        <span className="font-medium text-sm">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = formatDateISO(day);
          const isPast = dateStr < todayStr;
          const isSelected = selectedDates.includes(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && toggleDate(dateStr)}
              disabled={isPast}
              className={`h-9 rounded-lg text-sm font-medium transition-colors
                ${isPast ? 'text-gray-200 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-emerald-500 text-white' : ''}
                ${!isSelected && !isPast ? 'hover:bg-gray-100 text-gray-700' : ''}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
