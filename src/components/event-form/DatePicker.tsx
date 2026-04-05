'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get grid position (row, col) of a date within the calendar */
function getGridPos(dateStr: string, firstDayOfWeek: number): { row: number; col: number } {
  const day = new Date(dateStr + 'T00:00:00').getDate();
  const index = firstDayOfWeek + day - 1;
  return { row: Math.floor(index / 7), col: index % 7 };
}

/** Get all dates within the rectangle defined by two grid positions */
function getRectDates(
  a: string,
  b: string,
  allDays: Date[],
  firstDayOfWeek: number,
): string[] {
  const posA = getGridPos(a, firstDayOfWeek);
  const posB = getGridPos(b, firstDayOfWeek);
  const minRow = Math.min(posA.row, posB.row);
  const maxRow = Math.max(posA.row, posB.row);
  const minCol = Math.min(posA.col, posB.col);
  const maxCol = Math.max(posA.col, posB.col);

  const result: string[] = [];
  for (const day of allDays) {
    const ds = formatDateISO(day);
    const pos = getGridPos(ds, firstDayOfWeek);
    if (pos.row >= minRow && pos.row <= maxRow && pos.col >= minCol && pos.col <= maxCol) {
      result.push(ds);
    }
  }
  return result;
}

export default function DatePicker({ selectedDates, onDatesChange }: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [direction, setDirection] = useState(0);

  // Drag state
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const isDragging = useRef(false);
  // true = adding dates, false = removing dates (determined by first cell)
  const dragAdding = useRef(true);

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
  const todayStr = formatDateISO(today);
  const monthKey = `${viewYear}-${viewMonth}`;

  // Preview rectangle while dragging
  const previewRange = dragStart && dragEnd
    ? new Set(getRectDates(dragStart, dragEnd, days, firstDayOfWeek))
    : new Set<string>();

  function handlePointerDown(dateStr: string) {
    if (dateStr < todayStr) return;
    isDragging.current = true;
    // If the first cell is already selected, we're removing; otherwise adding
    dragAdding.current = !selectedDates.includes(dateStr);
    setDragStart(dateStr);
    setDragEnd(dateStr);
  }

  function handlePointerMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const btn = el.closest('[data-date]') as HTMLElement | null;
    if (!btn) return;
    const dateStr = btn.dataset.date!;
    if (dateStr < todayStr) return;
    setDragEnd(dateStr);
  }

  function handlePointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (dragStart && dragEnd) {
      const range = getRectDates(dragStart, dragEnd, days, firstDayOfWeek);
      if (range.length === 1) {
        // Single click: toggle
        const d = range[0];
        if (selectedDates.includes(d)) {
          onDatesChange(selectedDates.filter((x) => x !== d));
        } else {
          onDatesChange([...selectedDates, d].sort());
        }
      } else if (dragAdding.current) {
        // Drag add: merge range into selected
        const combined = new Set([...selectedDates, ...range]);
        onDatesChange(Array.from(combined).sort());
      } else {
        // Drag remove: remove range from selected
        const removeSet = new Set(range);
        onDatesChange(selectedDates.filter((d) => !removeSet.has(d)));
      }
    }
    setDragStart(null);
    setDragEnd(null);
  }

  function prevMonth() {
    setDirection(-1);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    setDirection(1);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  return (
    <div
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={() => { if (isDragging.current) handlePointerUp(); }}
      className="select-none"
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-semibold text-sm text-gray-900">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid — fixed 6-row height */}
      <div className="relative overflow-hidden" style={{ height: `${6 * 40}px` }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={monthKey}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-7 gap-1 absolute inset-x-0 top-0"
          >
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = formatDateISO(day);
              const isPast = dateStr < todayStr;
              const isSelected = selectedDates.includes(dateStr);
              const isInPreview = previewRange.has(dateStr) && !isPast;
              const isToday = dateStr === todayStr;

              // Preview: blue for adding, gray for removing
              const previewAdding = isInPreview && dragAdding.current;
              const previewRemoving = isInPreview && !dragAdding.current;

              return (
                <button
                  type="button"
                  key={dateStr}
                  disabled={isPast}
                  data-date={dateStr}
                  onMouseDown={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
                  className={`h-9 rounded-lg text-sm tabular-nums transition-colors
                    ${isPast ? 'text-gray-200 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected && !previewRemoving ? 'bg-emerald-600 text-white font-semibold' : ''}
                    ${previewAdding && !isSelected ? 'bg-emerald-100 text-emerald-700 font-semibold' : ''}
                    ${previewRemoving && isSelected ? 'bg-gray-200 text-gray-400 line-through' : ''}
                    ${!isSelected && !isInPreview && !isPast ? 'hover:bg-gray-100 text-gray-700' : ''}
                    ${isToday && !isSelected && !isInPreview ? 'ring-1 ring-inset ring-emerald-300' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: hint + count + reset */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">드래그로 여러 날짜 선택</span>
        {selectedDates.length > 0 && (
          <button
            type="button"
            onClick={() => onDatesChange([])}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
