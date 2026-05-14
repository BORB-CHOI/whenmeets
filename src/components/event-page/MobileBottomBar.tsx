'use client';

import type { Availability, AvailabilityLevel, EventMode } from '@/lib/types';
import SegmentedControl from '@/components/ui/SegmentedControl';
import CalendarImportButton from './CalendarImportButton';

interface MobileBottomBarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  onCancelEdit: () => void;
  saving?: boolean;
  dates: string[];
  timeStart: number;
  timeEnd: number;
  onCalendarImport: (availability: Availability) => void;
  eventMode: EventMode;
  activeMode: AvailabilityLevel;
  onActiveModeChange: (level: AvailabilityLevel) => void;
}

const mobileActionBase =
  'flex min-h-11 w-full items-center justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-70';

function MobileActionSlot({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}

function MobileActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        variant === 'primary'
          ? `${mobileActionBase} bg-teal-600 text-white shadow-[var(--shadow-primary)] hover:bg-teal-700`
          : `${mobileActionBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`
      }
    >
      {children}
    </button>
  );
}

export default function MobileBottomBar({
  isEditMode,
  onToggleMode,
  onCancelEdit,
  saving,
  dates,
  timeStart,
  timeEnd,
  onCalendarImport,
  eventMode,
  activeMode,
  onActiveModeChange,
}: MobileBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Edit-mode toggle bar (above action bar) */}
      {isEditMode && eventMode !== 'unavailable' && (
        <div className="border-t border-gray-200 bg-white/95 px-4 py-2 backdrop-blur-md">
          <SegmentedControl
            options={[
              { value: 'available', label: 'Available' },
              { value: 'if_needed', label: 'If Needed', variant: 'warning' },
            ]}
            value={activeMode === 2 ? 'available' : 'if_needed'}
            onChange={(v) => onActiveModeChange(v === 'available' ? 2 : 1)}
          />
        </div>
      )}
      {isEditMode && eventMode === 'unavailable' && (
        <div className="border-t border-gray-200 bg-white/95 px-4 py-2 backdrop-blur-md">
          <div className="rounded-md bg-red-50 px-3 py-1.5 text-center text-sm font-medium text-red-700">
            ⛔ 안 되는 시간을 드래그하세요
          </div>
        </div>
      )}
      {/* Bottom bar */}
      <div
        className="border-t border-gray-200 bg-white/95 px-4 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid min-h-[72px] grid-cols-2 items-center gap-3">
          {isEditMode ? (
            <>
              <MobileActionSlot>
                <MobileActionButton onClick={onCancelEdit} disabled={saving} variant="danger">
                  취소
                </MobileActionButton>
              </MobileActionSlot>
              <MobileActionSlot>
                <MobileActionButton onClick={onToggleMode} disabled={saving} variant="primary">
                  {saving ? '저장 중...' : '편집 완료'}
                </MobileActionButton>
              </MobileActionSlot>
            </>
          ) : (
            <>
              <MobileActionSlot>
                <CalendarImportButton
                  dates={dates}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  onImport={onCalendarImport}
                  variant="compact"
                />
              </MobileActionSlot>
              <MobileActionSlot>
                <MobileActionButton onClick={onToggleMode} disabled={saving} variant="primary">
                  편집
                </MobileActionButton>
              </MobileActionSlot>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
