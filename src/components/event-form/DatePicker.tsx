'use client';

import { useRef, useState, useEffect } from 'react';
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

export default function DatePicker({ selectedDates, onDatesChange }: DatePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [direction, setDirection] = useState(0);

  // Drag state — free-form: first cell determines add/remove mode, then every touched cell toggles
  const isDragging = useRef(false);
  const dragAdding = useRef(true);
  const touchedDates = useRef(new Set<string>());
  const draftSelected = useRef(new Set<string>());
  const [previewSet, setPreviewSet] = useState<Set<string>>(new Set());

  const days = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
  const todayStr = formatDateISO(today);
  const monthKey = `${viewYear}-${viewMonth}`;

  function applyToDate(dateStr: string) {
    if (dateStr < todayStr) return;
    if (touchedDates.current.has(dateStr)) return;
    touchedDates.current.add(dateStr);

    if (dragAdding.current) {
      draftSelected.current.add(dateStr);
    } else {
      draftSelected.current.delete(dateStr);
    }
    setPreviewSet(new Set(draftSelected.current));
  }

  function handlePointerDown(dateStr: string) {
    if (dateStr < todayStr) return;
    isDragging.current = true;
    touchedDates.current = new Set();
    draftSelected.current = new Set(selectedDates);
    // First cell determines mode: if selected → remove mode, if not → add mode
    dragAdding.current = !selectedDates.includes(dateStr);
    applyToDate(dateStr);
  }

  const rafId = useRef(0);

  function handleMoveAt(clientX: number, clientY: number) {
    if (!isDragging.current) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return;
      const btn = el.closest('[data-date]') as HTMLElement | null;
      if (!btn) return;
      applyToDate(btn.dataset.date!);
    });
  }

  function handleMouseMove(e: React.MouseEvent) {
    handleMoveAt(e.clientX, e.clientY);
  }

  function handlePointerUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    onDatesChange(Array.from(draftSelected.current).sort());
    setPreviewSet(new Set());
    touchedDates.current.clear();
  }

  // Window-level listeners for drag end
  useEffect(() => {
    function onEnd() {
      if (isDragging.current) handlePointerUp();
    }
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDates]);

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

  const rootRef = useRef<HTMLDivElement | null>(null);

  // Native (non-passive) touchmove so preventDefault works
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    function onTouchMoveNative(e: TouchEvent) {
      if (!isDragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      handleMoveAt(touch.clientX, touch.clientY);
    }
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMoveNative);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      className="select-none"
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
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
              const isToday = dateStr === todayStr;

              // During drag, use preview set; otherwise use selectedDates
              const isSelected = isDragging.current
                ? previewSet.has(dateStr)
                : selectedDates.includes(dateStr);

              return (
                <button
                  type="button"
                  key={dateStr}
                  disabled={isPast}
                  data-date={dateStr}
                  onMouseDown={(e) => { e.preventDefault(); handlePointerDown(dateStr); }}
                  onTouchStart={() => { handlePointerDown(dateStr); }}
                  className={`h-9 rounded-lg text-sm tabular-nums transition-colors
                    ${isPast ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected ? 'bg-emerald-600 text-white font-semibold' : ''}
                    ${!isSelected && !isPast ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300' : ''}
                    ${isToday && !isSelected ? 'ring-1 ring-inset ring-emerald-300' : ''}`}
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
        <span className="text-xs text-gray-400 dark:text-gray-500">드래그로 여러 날짜 선택</span>
        {selectedDates.length > 0 && (
          <button
            type="button"
            onClick={() => onDatesChange([])}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
