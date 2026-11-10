'use client';

import type { AvailabilityLevel, EventMode } from '@/lib/types';
import SegmentedControl from '@/components/ui/SegmentedControl';
import EventActions from './EventActions';

interface MobileBottomBarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  onCancelEdit: () => void;
  saving?: boolean;
  saveFailed?: boolean;
  copied: boolean;
  onCopy: () => void;
  eventMode: EventMode;
  activeMode: AvailabilityLevel;
  onActiveModeChange: (level: AvailabilityLevel) => void;
}

export default function MobileBottomBar({
  isEditMode,
  onToggleMode,
  onCancelEdit,
  saving,
  saveFailed,
  copied,
  onCopy,
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
        <div className="flex min-h-[72px] flex-col justify-center">
          <EventActions
            editing={isEditMode}
            busy={!!saving}
            saveFailed={!!saveFailed}
            copied={copied}
            onEdit={onToggleMode}
            onFinish={onToggleMode}
            onCancel={onCancelEdit}
            onCopy={onCopy}
          />
        </div>
      </div>
    </div>
  );
}
