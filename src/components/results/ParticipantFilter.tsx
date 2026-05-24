'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { AvailabilityLevel, EventMode } from '@/lib/types';
import { toggleParticipant } from './participantToggle';

type SlotAvailabilityMap = Map<string, AvailabilityLevel | undefined>;

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
  slotAvailability?: SlotAvailabilityMap;
  onDelete?: (participantId: string) => void;
  editMode?: boolean;
  /** Available 모드면 v===2가 "가능", v===1이 if-needed. Unavailable 모드면
   *  v===0가 "안 됨 응답", 그 외(undefined 포함)는 "안 된다고 안 함 = 가능 가정". */
  eventMode?: EventMode;
}

export interface ParticipantFilterHandle {
  previewSlot: (slotAvailability: SlotAvailabilityMap | null) => void;
}

const UNAVAILABLE_CLASSES = ['[&_.p-name]:line-through', '[&_.p-name]:text-gray-400', '[&_.p-icon]:opacity-40'];

function isAvailableForSlot(val: AvailabilityLevel | undefined, eventMode: EventMode): boolean {
  return eventMode === 'unavailable' ? val !== 0 : val === 2;
}

function isIfNeededForSlot(val: AvailabilityLevel | undefined, eventMode: EventMode): boolean {
  return eventMode === 'available' && val === 1;
}

const ParticipantFilter = forwardRef<ParticipantFilterHandle, ParticipantFilterProps>(function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
  onHover,
  onHoverEnd,
  slotAvailability,
  onDelete,
  editMode = false,
  eventMode = 'available',
}, ref) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useImperativeHandle(ref, () => ({
    previewSlot(nextSlotAvailability) {
      for (const p of participants) {
        const row = rowRefs.current.get(p.id);
        if (!row) continue;

        row.classList.remove('bg-[#FFE8B8]', 'rounded', ...UNAVAILABLE_CLASSES);

        if (!nextSlotAvailability) continue;

        const val = nextSlotAvailability.get(p.id);
        if (isIfNeededForSlot(val, eventMode)) {
          row.classList.add('bg-[#FFE8B8]', 'rounded');
        } else if (!isAvailableForSlot(val, eventMode)) {
          row.classList.add(...UNAVAILABLE_CLASSES);
        }
      }
    },
  }), [participants, eventMode]);

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

  return (
    <div onPointerLeave={(e) => { if (e.pointerType === 'mouse') onHoverEnd?.(); }}>
      <div className="flex flex-col gap-0.5">
        {sortedParticipants.map((p) => {
          const selected = selectedIds.has(p.id);
          const showCheckbox = selected && !isAllSelected;
          const isDimmed = !selected && !isAllSelected;

          let stateClass = '';
          if (hasSlotHover) {
            const val = slotAvailability!.get(p.id);
            if (isIfNeededForSlot(val, eventMode)) {
              stateClass = 'bg-[#FFE8B8] rounded';
            } else if (isAvailableForSlot(val, eventMode)) {
              stateClass = '';
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
              onClick={editMode ? undefined : () => toggle(p.id)}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover?.(p.id); }}
              className={`group flex items-center gap-2.5 py-1.5 px-2 rounded-md transition-colors
                ${editMode ? 'cursor-default' : 'cursor-pointer'}
                ${isDimmed ? 'opacity-50' : ''}
                ${stateClass}
                ${!hasSlotHover ? 'hover:bg-gray-50' : ''}`}
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
                      className={`p-icon w-6 h-6 rounded-full object-cover shrink-0 ${editMode ? '' : 'group-hover:hidden'}`}
                    />
                  ) : (
                    <div className={`p-icon w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0 ${editMode ? '' : 'group-hover:hidden'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                  {!editMode && (
                    <div className="p-icon w-6 h-6 rounded-md bg-white border-2 border-gray-300 shrink-0 hidden group-hover:flex" aria-hidden="true" />
                  )}
                </>
              )}
              <span className="p-name text-sm font-medium text-gray-900 flex-1">
                {p.name}
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
    </div>
  );
});

export default ParticipantFilter;
