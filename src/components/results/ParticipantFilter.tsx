'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AvailabilityLevel } from '@/lib/types';
import { toggleParticipant } from './participantToggle';

interface ParticipantFilterProps {
  participants: {
    id: string;
    name: string;
    availability?: Record<string, Record<string, AvailabilityLevel>>;
    avatar_url?: string | null;
  }[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onHover?: (participantId: string) => void;
  onHoverEnd?: () => void;
  slotAvailability?: Map<string, AvailabilityLevel>;
  onDelete?: (participantId: string) => void;
}

export interface ParticipantFilterHandle {
  previewSlot: (slotAvailability: Map<string, AvailabilityLevel> | null) => void;
}

const UNAVAILABLE_CLASSES = ['[&_.p-name]:line-through', '[&_.p-name]:text-gray-400', '[&_.p-icon]:opacity-40'];

const ParticipantFilter = forwardRef<ParticipantFilterHandle, ParticipantFilterProps>(function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
  onHover,
  onHoverEnd,
  slotAvailability,
  onDelete,
}, ref) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const ifNeededRefs = useRef(new Map<string, HTMLSpanElement>());
  const legendRef = useRef<HTMLParagraphElement | null>(null);

  useImperativeHandle(ref, () => ({
    previewSlot(nextSlotAvailability) {
      let hasIfNeeded = false;

      for (const p of participants) {
        const row = rowRefs.current.get(p.id);
        if (!row) continue;

        row.classList.remove('bg-[#FFE8B8]', 'rounded', ...UNAVAILABLE_CLASSES);
        const marker = ifNeededRefs.current.get(p.id);
        if (marker) marker.hidden = true;

        const val = nextSlotAvailability?.get(p.id);
        if (val === 1) {
          hasIfNeeded = true;
          row.classList.add('bg-[#FFE8B8]', 'rounded');
          if (marker) marker.hidden = false;
        } else if (nextSlotAvailability && val !== 2) {
          row.classList.add(...UNAVAILABLE_CLASSES);
        }
      }

      if (legendRef.current) legendRef.current.hidden = !hasIfNeeded;
    },
  }), [participants]);

  function toggle(id: string) {
    const allIds = participants.map((p) => p.id);
    onSelectedChange(toggleParticipant(selectedIds, id, allIds));
  }

  const isAllSelected = selectedIds.size === participants.length;

  const sortedParticipants = useMemo(() => {
    if (isAllSelected) return participants;
    const selected: typeof participants = [];
    const unselected: typeof participants = [];
    for (const p of participants) {
      if (selectedIds.has(p.id)) selected.push(p);
      else unselected.push(p);
    }
    return [...selected, ...unselected];
  }, [participants, selectedIds, isAllSelected]);

  const hasSlotHover = slotAvailability && slotAvailability.size > 0;
  const hasIfNeeded = hasSlotHover && Array.from(slotAvailability!.values()).some((v) => v === 1);

  return (
    <div onMouseLeave={() => onHoverEnd?.()}>
      <div className="flex flex-col gap-0.5">
        {sortedParticipants.map((p) => {
          const selected = selectedIds.has(p.id);
          const showCheckbox = selected && !isAllSelected;
          const isDimmed = !selected && !isAllSelected;

          let stateClass = '';
          if (hasSlotHover) {
            const val = slotAvailability!.get(p.id);
            if (val === 2) {
              stateClass = '';
            } else if (val === 1) {
              stateClass = 'bg-[#FFE8B8] rounded';
            } else {
              stateClass = '[&_.p-name]:line-through [&_.p-name]:text-gray-400 [&_.p-icon]:opacity-40';
            }
          }

          return (
            <motion.div
              key={p.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
              ref={(el) => {
                if (el) rowRefs.current.set(p.id, el);
                else rowRefs.current.delete(p.id);
              }}
              onClick={() => toggle(p.id)}
              onMouseEnter={() => onHover?.(p.id)}
              className={`group flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors
                ${isDimmed ? 'opacity-50' : ''}
                ${stateClass}
                ${!hasSlotHover ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
            >
              {showCheckbox ? (
                <div className="p-icon w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center shrink-0 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <>
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="p-icon w-6 h-6 rounded-full object-cover shrink-0 group-hover:hidden"
                    />
                  ) : (
                    <div className="p-icon w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0 group-hover:hidden">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-icon w-6 h-6 rounded-md bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shrink-0 hidden group-hover:flex" aria-hidden="true" />
                </>
              )}
              <span className="p-name text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                {p.name}
                <span
                  ref={(el) => {
                    if (el) ifNeededRefs.current.set(p.id, el);
                    else ifNeededRefs.current.delete(p.id);
                  }}
                  className="text-gray-500"
                  hidden={!hasSlotHover || slotAvailability!.get(p.id) !== 1}
                >*</span>
              </span>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                  className="p-1 text-gray-300 hover:text-red-500 focus:text-red-500 focus-visible:opacity-100 transition-colors opacity-0 group-hover:opacity-100 active:opacity-100 shrink-0"
                  aria-label={`${p.name} 응답 삭제`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <p ref={legendRef} className="text-xs text-gray-400 mt-2 px-2" hidden={!hasIfNeeded}>* if needed</p>
    </div>
  );
});

export default ParticipantFilter;
