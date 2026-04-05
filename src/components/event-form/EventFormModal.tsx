'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventMode } from '@/lib/types';
import { addEventToHistory } from '@/lib/event-history';
import SegmentedControl from '@/components/ui/SegmentedControl';
import DatePicker from './DatePicker';
import TimeRangePicker from './TimeRangePicker';
import DayOfWeekPicker from './DayOfWeekPicker';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  // edit mode props
  editEvent?: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
    mode: EventMode;
    date_only: boolean;
  };
  onEventUpdated?: () => void;
}

type DateSelectionMode = 'calendar' | 'days_of_week';

function detectDateSelectionMode(dates: string[]): DateSelectionMode {
  if (dates.length === 0) return 'calendar';
  // ISO dates look like YYYY-MM-DD (10 chars with dashes at positions 4 and 7)
  return /^\d{4}-\d{2}-\d{2}$/.test(dates[0]) ? 'calendar' : 'days_of_week';
}

export default function EventFormModal({ open, onClose, editEvent, onEventUpdated }: EventFormModalProps) {
  const router = useRouter();
  const now = new Date();
  const [title, setTitle] = useState(
    editEvent?.title ?? `새 이벤트 ${now.getMonth() + 1}/${now.getDate()}`,
  );
  const [dates, setDates] = useState<string[]>(editEvent?.dates ?? []);
  const [timeStart, setTimeStart] = useState(editEvent?.time_start ?? 36);
  const [timeEnd, setTimeEnd] = useState(editEvent?.time_end ?? 84);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTimeRange, setShowTimeRange] = useState(editEvent ? !editEvent.date_only : true);
  const [mode, setMode] = useState<EventMode>(editEvent?.mode ?? 'available');
  const [titleError, setTitleError] = useState(false);
  const [dateSelectionMode, setDateSelectionMode] = useState<DateSelectionMode>(
    editEvent ? detectDateSelectionMode(editEvent.dates) : 'calendar',
  );

  const dateOnly = !showTimeRange;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(false);

    if (!title.trim()) {
      setError('제목을 입력해주세요');
      setTitleError(true);
      return;
    }
    if (dates.length === 0) {
      setError('최소 하나의 날짜를 선택해주세요');
      return;
    }

    setSubmitting(true);
    setError('');

    if (editEvent) {
      const res = await fetch(`/api/events/${editEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          dates,
          time_start: dateOnly ? 0 : timeStart,
          time_end: dateOnly ? 48 : timeEnd,
          mode,
          date_only: dateOnly,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '이벤트 수정에 실패했습니다');
        setSubmitting(false);
        return;
      }
      onClose();
      onEventUpdated?.();
      return;
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        dates,
        time_start: dateOnly ? 0 : timeStart,
        time_end: dateOnly ? 48 : timeEnd,
        password: password || undefined,
        mode,
        date_only: dateOnly,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || '이벤트 생성에 실패했습니다');
      setSubmitting(false);
      return;
    }

    const { id } = await res.json();
    addEventToHistory({
      id,
      title: title.trim(),
      dates,
      role: 'creator',
      participantCount: 0,
      lastVisited: new Date().toISOString(),
    });
    onClose();
    window.scrollTo(0, 0);
    router.push(`/e/${id}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).dataset.backdropMousedown = 'true'; }}
          onClick={(e) => { if (e.target === e.currentTarget && (e.currentTarget as HTMLElement).dataset.backdropMousedown === 'true') onClose(); (e.currentTarget as HTMLElement).dataset.backdropMousedown = ''; }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editEvent ? '이벤트 수정' : '이벤트 만들기'}</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <form
              onSubmit={handleSubmit}
              className="px-6 pb-5 pt-2 flex flex-col gap-3 overflow-y-scroll overscroll-contain flex-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent', scrollbarGutter: 'stable' }}
            >
              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
                placeholder="이벤트 제목"
                className={`w-full px-4 py-2.5 border rounded-md transition-all focus:border-emerald-600 ${
                  titleError ? 'border-red-500 ring ring-red-500/10' : 'border-gray-200'
                }`}
                maxLength={100}
                autoFocus
              />

              {/* Response mode */}
              <SegmentedControl
                options={[
                  { value: 'available', label: '되는 시간 수합' },
                  { value: 'unavailable', label: '안 되는 시간 수합', variant: 'danger' as const },
                ]}
                value={mode}
                onChange={(v) => setMode(v as EventMode)}
              />

              {/* Date selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    날짜 {dates.length > 0 && `(${dates.length}개 선택)`}
                  </label>
                  <div className="shrink-0">
                    <SegmentedControl
                      options={[
                        { value: 'calendar' as const, label: '캘린더' },
                        { value: 'days_of_week' as const, label: '요일' },
                      ]}
                      value={dateSelectionMode}
                      onChange={(v) => { setDateSelectionMode(v as DateSelectionMode); setDates([]); }}
                    />
                  </div>
                </div>
                {dateSelectionMode === 'calendar' ? (
                  <DatePicker selectedDates={dates} onDatesChange={setDates} />
                ) : (
                  <DayOfWeekPicker selectedDays={dates} onDaysChange={setDates} />
                )}
              </div>

              {/* Time range — checkbox toggle with animation */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTimeRange}
                    onChange={(e) => setShowTimeRange(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-600">특정 시간대 지정</span>
                </label>

                <AnimatePresence initial={false}>
                  {showTimeRange && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <TimeRangePicker
                          timeStart={timeStart}
                          timeEnd={timeEnd}
                          onTimeStartChange={setTimeStart}
                          onTimeEndChange={setTimeEnd}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Optional password */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {showPassword ? '비밀번호 제거' : '비밀번호 추가'}
                </button>
                <AnimatePresence initial={false}>
                  {showPassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-emerald-600"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-emerald-700 hover:shadow-[var(--shadow-primary-hover)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting
                  ? (editEvent ? '수정 중...' : '생성 중...')
                  : (editEvent ? '수정 완료' : '이벤트 만들기')}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
