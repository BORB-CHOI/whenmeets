'use client';

import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import type { AvailabilityLevel, EventMode } from '@/lib/types';
import { formatDateCompact, slotToTime } from '@/lib/constants';
import ParticipantFilter from '@/components/results/ParticipantFilter';

type Participants = ComponentProps<typeof ParticipantFilter>['participants'];

interface MobileSlotSheetProps {
  date: string;
  /** null = date-only event (no time slot) */
  slot: number | null;
  /** undefined values represent participants who didn't respond.
   *  Unavailable 모드에서 "응답 안 함"과 "안 됨 응답"(val===0)을 구분하기 위해 필요. */
  slotAvailability: Map<string, AvailabilityLevel | undefined>;
  participants: Participants;
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onClose: () => void;
  onDelete?: (participantId: string) => void;
  eventMode: EventMode;
  includeIfNeeded: boolean;
}

export default function MobileSlotSheet({
  date,
  slot,
  slotAvailability,
  participants,
  selectedIds,
  onSelectedChange,
  onClose,
  onDelete,
  eventMode,
  includeIfNeeded,
}: MobileSlotSheetProps) {
  const slotValues = Array.from(slotAvailability.values());
  const availableCount = slotValues.filter(
    eventMode === 'unavailable'
      ? (v) => v !== 0
      : (v) => v === 2 || (v === 1 && includeIfNeeded),
  ).length;
  const slotHasIfNeeded = slotValues.some((v) => v === 1);

  const label =
    slot === null
      ? formatDateCompact(date)
      : `${formatDateCompact(date)} · ${slotToTime(slot)} – ${slotToTime(slot + 1)}`;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.35 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 36 || info.velocity.y > 450) onClose();
      }}
      className="fixed inset-x-0 bottom-[72px] z-30 overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white lg:hidden"
    >
      <div className="flex justify-center pt-2">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
      <div className="max-h-[48vh] overflow-y-auto px-5 pb-5 pt-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              응답자 ({availableCount}/{participants.length})
            </h3>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-gray-500">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            닫기
          </button>
        </div>
        <ParticipantFilter
          participants={participants}
          selectedIds={selectedIds}
          onSelectedChange={onSelectedChange}
          slotAvailability={slotAvailability}
          onDelete={onDelete}
          eventMode={eventMode}
        />
        {slotHasIfNeeded && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              <span className="inline-block w-3.5 h-3.5 rounded-[3px] bg-[#FFE8B8] align-middle mr-1.5" />
              if needed
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
