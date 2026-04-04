'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EventMode } from '@/lib/types';
import DatePicker from './DatePicker';
import TimeRangePicker from './TimeRangePicker';

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [timeStart, setTimeStart] = useState(18); // 09:00
  const [timeEnd, setTimeEnd] = useState(42);     // 21:00
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dateOnly, setDateOnly] = useState(false);
  const [mode, setMode] = useState<EventMode>('available');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력해주세요');
      return;
    }
    if (dates.length === 0) {
      setError('최소 하나의 날짜를 선택해주세요');
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
      setError(data.error || '일정 생성에 실패했습니다');
      setSubmitting(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/e/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
          className="w-full px-4 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          maxLength={100}
        />
      </div>

      {/* Mode toggle: Dates and times / Dates only */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">유형</label>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setDateOnly(false)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${!dateOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            날짜 + 시간
          </button>
          <button
            type="button"
            onClick={() => setDateOnly(true)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${dateOnly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            날짜만
          </button>
        </div>
      </div>

      {/* Response mode: available / unavailable */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">응답 방식</label>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('available')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${mode === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            되는 시간 수합
          </button>
          <button
            type="button"
            onClick={() => setMode('unavailable')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${mode === 'unavailable' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            안 되는 시간 수합
          </button>
        </div>
      </div>

      {/* Date picker */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">
          날짜 {dates.length > 0 && `(${dates.length}개 선택)`}
        </label>
        <DatePicker selectedDates={dates} onDatesChange={setDates} />
      </div>

      {/* Time range — hidden for date-only mode */}
      {!dateOnly && (
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            시간 범위
          </label>
          <TimeRangePicker
            timeStart={timeStart}
            timeEnd={timeEnd}
            onTimeStartChange={setTimeStart}
            onTimeEndChange={setTimeEnd}
          />
        </div>
      )}

      {/* Optional password */}
      <div>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showPassword ? '비밀번호 제거' : '+ 비밀번호 추가 (선택사항)'}
        </button>
        {showPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="mt-2 w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
      >
        {submitting ? '생성 중...' : '일정 만들기'}
      </button>
    </form>
  );
}
