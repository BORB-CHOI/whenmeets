'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '@/lib/types';
import ParticipantFilter from '@/components/results/ParticipantFilter';

interface MobileBottomBarProps {
  participants: Pick<Participant, 'id' | 'name' | 'availability' | 'created_at'>[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  slotAvailability?: Map<string, 0 | 1 | 2>;
  isEditMode: boolean;
  onToggleMode: () => void;
  saving?: boolean;
}

export default function MobileBottomBar({
  participants,
  selectedIds,
  onSelectedChange,
  slotAvailability,
  isEditMode,
  onToggleMode,
  saving,
}: MobileBottomBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white border-t border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 max-h-60 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                응답자 ({participants.length})
              </h3>
              <ParticipantFilter
                participants={participants}
                selectedIds={isEditMode ? new Set(participants.map(p => p.id)) : selectedIds}
                onSelectedChange={isEditMode ? () => {} : onSelectedChange}
                slotAvailability={slotAvailability}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div
        className="bg-white border-t border-gray-200 px-4 flex items-center justify-between gap-3"
        style={{ height: 56, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          <span className="font-medium">응답자 {participants.length}명</span>
        </button>

        <button
          onClick={onToggleMode}
          disabled={saving}
          className={`px-5 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer disabled:opacity-70 ${
            isEditMode
              ? 'bg-emerald-600 text-white shadow-[var(--shadow-primary)]'
              : 'bg-emerald-600 text-white shadow-[var(--shadow-primary)]'
          }`}
        >
          {isEditMode ? (saving ? '저장 중...' : '편집 완료') : '내 시간 입력'}
        </button>
      </div>
    </div>
  );
}
