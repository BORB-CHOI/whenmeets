'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventMode } from '@/lib/types';
import SegmentedControl from '@/components/ui/SegmentedControl';
import DatePicker from './DatePicker';
import TimeRangePicker from './TimeRangePicker';

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState(() => {
    const now = new Date();
    return `새 이벤트 ${now.getMonth() + 1}/${now.getDate()}`;
  });
  const [dates, setDates] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState(36);
  const [timeEnd, setTimeEnd] = useState(84);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateOnly, setDateOnly] = useState(false);
  const [mode, setMode] = useState<EventMode>('available');
  const [titleError, setTitleError] = useState(false);
  const [dateError, setDateError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(false);
    setDateError(false);

    if (!title.trim()) {
      setError('제목을 입력해주세요');
      setTitleError(true);
      return;
    }
    if (dates.length === 0) {
      setError('최소 하나의 날짜를 선택해주세요');
      setDateError(true);
      return;
    }

    setSubmitting(true);
    setError('');

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
    window.scrollTo(0, 0);
    router.push(`/e/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError(false);
          }}
          placeholder="이벤트 제목"
          className={`w-full px-4 py-3 text-lg border rounded-md transition-all focus:border-emerald-600 dark:bg-gray-800 dark:text-gray-100 ${
            titleError
              ? 'border-red-500 ring ring-red-500/10'
              : 'border-gray-200 dark:border-gray-600'
          }`}
          maxLength={100}
        />
      </div>

      {/* Type toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">유형</label>
        <SegmentedControl
          options={[
            { value: 'datetime', label: '날짜 + 시간' },
            { value: 'dateonly', label: '날짜만' },
          ]}
          value={dateOnly ? 'dateonly' : 'datetime'}
          onChange={(v) => setDateOnly(v === 'dateonly')}
        />
      </div>

      {/* Response mode */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">응답 방식</label>
        <SegmentedControl
          options={[
            { value: 'available', label: '되는 시간 수합' },
            { value: 'unavailable', label: '안 되는 시간 수합', variant: 'danger' as const },
          ]}
          value={mode}
          onChange={(v) => setMode(v as EventMode)}
        />
      </div>

      {/* Date picker */}
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          날짜 {dates.length > 0 && `(${dates.length}개 선택)`}
        </label>
        <DatePicker selectedDates={dates} onDatesChange={setDates} />
      </div>

      {/* Time range */}
      {!dateOnly && (
        <TimeRangePicker
          timeStart={timeStart}
          timeEnd={timeEnd}
          onTimeStartChange={setTimeStart}
          onTimeEndChange={setTimeEnd}
        />
      )}

      {/* Optional password */}
      <div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {showPassword ? '비밀번호 제거' : '비밀번호 추가 (선택)'}
        </button>
        {showPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="mt-2 w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-md transition-all focus:border-emerald-600 dark:bg-gray-800 dark:text-gray-100"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-emerald-700 hover:shadow-[var(--shadow-primary-hover)] transition-all disabled:opacity-50 cursor-pointer"
      >
        {submitting ? '생성 중...' : '이벤트 만들기'}
      </button>
    </form>
  );
}
