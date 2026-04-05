'use client';

import { AvailabilityLevel } from '@/lib/types';

interface ParticipantFilterProps {
  participants: { id: string; name: string; availability?: Record<string, Record<string, AvailabilityLevel>> }[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onHover?: (participantId: string) => void;
  onHoverEnd?: () => void;
  /** When a cell is hovered: map of participant id -> availability value at that slot */
  slotAvailability?: Map<string, AvailabilityLevel>;
  /** If provided, show delete button for each participant */
  onDelete?: (participantId: string) => void;
}

export default function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
  onHover,
  onHoverEnd,
  slotAvailability,
  onDelete,
}: ParticipantFilterProps) {
  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  const hasSlotHover = slotAvailability && slotAvailability.size > 0;
  const hasIfNeeded = hasSlotHover && Array.from(slotAvailability!.values()).some((v) => v === 1);

  return (
    <div>
      <div className="flex flex-col gap-0.5">
        {participants.map((p) => {
          const selected = selectedIds.has(p.id);

          // Determine hover state based on slot availability
          let stateClass = '';
          if (hasSlotHover) {
            const val = slotAvailability!.get(p.id);
            if (val === 2) {
              // available — normal
              stateClass = '';
            } else if (val === 1) {
              // if needed — yellow background
              stateClass = 'bg-[#FFE8B8] rounded';
            } else {
              // unavailable — strikethrough + gray
              stateClass = '[&_.p-name]:line-through [&_.p-name]:text-gray-400 [&_.p-icon]:opacity-40';
            }
          }

          return (
            <div
              key={p.id}
              onClick={() => toggle(p.id)}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHoverEnd?.()}
              className={`group flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-all
                ${!selected ? 'opacity-40' : ''}
                ${stateClass}
                ${!hasSlotHover ? 'hover:bg-gray-50' : ''}`}
            >
              <div className="p-icon w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className="p-name text-sm font-medium text-gray-900 flex-1">
                {p.name}
                {hasSlotHover && slotAvailability!.get(p.id) === 1 && (
                  <span className="text-gray-500">*</span>
                )}
              </span>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="응답 삭제"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* if needed legend */}
      {hasIfNeeded && (
        <p className="text-xs text-gray-400 mt-2 px-2">* if needed</p>
      )}
    </div>
  );
}
