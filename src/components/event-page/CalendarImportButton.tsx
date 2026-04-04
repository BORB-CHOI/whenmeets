'use client';

import { useState, useEffect, useRef } from 'react';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import { fetchCalendarEvents, calendarEventsToAvailability } from '@/lib/calendar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Availability } from '@/lib/types';

interface CalendarImportButtonProps {
  dates: string[];
  timeStart: number;
  timeEnd: number;
  onImport: (availability: Availability) => void;
}

export default function CalendarImportButton({
  dates,
  timeStart,
  timeEnd,
  onImport,
}: CalendarImportButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const supabaseRef = useRef(createAuthBrowserClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) return null;

  async function handleImport() {

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        setError('캘린더 권한이 없습니다. Google 로그인 시 캘린더 접근을 허용해주세요.');
        setLoading(false);
        return;
      }

      const events = await fetchCalendarEvents(session.provider_token, dates);
      const availability = calendarEventsToAvailability(events, dates, timeStart, timeEnd);
      onImport(availability);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '캘린더를 불러오는 중 오류가 발생했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setShowImportConfirm(true)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-emerald-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            불러오는 중...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            캘린더에서 가져오기
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-600 px-1">{error}</p>
      )}
      <ConfirmModal
        open={showImportConfirm}
        title="캘린더 가져오기"
        message="캘린더 이벤트를 가져오면 현재 입력한 시간이 덮어쓰기됩니다. 계속하시겠습니까?"
        confirmLabel="가져오기"
        onConfirm={() => { setShowImportConfirm(false); handleImport(); }}
        onCancel={() => setShowImportConfirm(false)}
      />
    </div>
  );
}
