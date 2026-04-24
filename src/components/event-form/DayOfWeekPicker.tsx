'use client';

import { useEffect, useRef, useState } from 'react';

interface DayOfWeekPickerProps {
  selectedDays: string[];
  onDaysChange: (days: string[]) => void;
}

const DAYS_SUN_START = ['일', '월', '화', '수', '목', '금', '토'];
const DAYS_MON_START = ['월', '화', '수', '목', '금', '토', '일'];

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

  // Drag state
  const isDragging = useRef(false);
  const draftRef = useRef<Set<string>>(new Set(selectedDays));
  const erasing = useRef(false);
  const visited = useRef<Set<string>>(new Set());

  // Keep draft in sync with external selectedDays when not dragging
  useEffect(() => {
    if (!isDragging.current) {
      draftRef.current = new Set(selectedDays);
    }
  }, [selectedDays]);

  function applyToKey(key: string) {
    if (visited.current.has(key)) return;
    visited.current.add(key);
    if (erasing.current) {
      draftRef.current.delete(key);
    } else {
      draftRef.current.add(key);
    }
    onDaysChange(Array.from(draftRef.current));
  }

  function handlePointerDown(key: string) {
    isDragging.current = true;
    draftRef.current = new Set(selectedDays);
    visited.current = new Set();
    erasing.current = draftRef.current.has(key);
    applyToKey(key);
  }

  function handlePointerEnter(key: string) {
    if (!isDragging.current) return;
    applyToKey(key);
  }

  // End drag on window pointer up to handle releases outside the buttons
  useEffect(() => {
    function onEnd() {
      isDragging.current = false;
      visited.current = new Set();
    }
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // Touch drag: track moving finger across buttons
  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const btn = el?.closest('[data-day-key]') as HTMLElement | null;
    if (btn?.dataset.dayKey) applyToKey(btn.dataset.dayKey);
  }

  function selectWeekdays() {
    onDaysChange(['mon', 'tue', 'wed', 'thu', 'fri']);
  }

  function selectAll() {
    onDaysChange(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  }

  return (
    <div>
      <div
        className="grid grid-cols-7 gap-2 mb-3 select-none"
        onTouchMove={handleTouchMove}
        style={{ touchAction: 'none' }}
      >
        {days.map((day) => {
          const key = DAY_KEYS[day];
          const selected = selectedDays.includes(key);
          return (
            <button
              type="button"
              key={key}
              data-day-key={key}
              onMouseDown={(e) => { e.preventDefault(); handlePointerDown(key); }}
              onMouseEnter={() => handlePointerEnter(key)}
              onTouchStart={(e) => { e.preventDefault(); handlePointerDown(key); }}
              className={`h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${selected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
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
