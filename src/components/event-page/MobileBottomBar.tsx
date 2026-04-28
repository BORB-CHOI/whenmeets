'use client';

import type { Availability } from '@/lib/types';
import CalendarImportButton from './CalendarImportButton';

interface MobileBottomBarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  saving?: boolean;
  dates: string[];
  timeStart: number;
  timeEnd: number;
  onCalendarImport: (availability: Availability) => void;
}

export default function MobileBottomBar({
  isEditMode,
  onToggleMode,
  saving,
  dates,
  timeStart,
  timeEnd,
  onCalendarImport,
}: MobileBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Bottom bar */}
      <div
        className="border-t border-gray-200 bg-white/95 px-4 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex min-h-[72px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <CalendarImportButton
              dates={dates}
              timeStart={timeStart}
              timeEnd={timeEnd}
              onImport={onCalendarImport}
              variant="compact"
            />
          </div>

          <button
            onClick={onToggleMode}
            disabled={saving}
            className="min-h-11 min-w-[132px] rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-all hover:bg-emerald-700 disabled:opacity-70"
          >
            {isEditMode ? (saving ? '저장 중...' : '편집 완료') : '내 시간 입력'}
          </button>
        </div>
      </div>
    </div>
  );
}
