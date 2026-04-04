'use client';

interface ParticipantFilterProps {
  participants: { id: string; name: string }[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onHover?: (participantId: string) => void;
  onHoverEnd?: () => void;
  highlightedIds?: Set<string>;
}

export default function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
  onHover,
  onHoverEnd,
  highlightedIds,
}: ParticipantFilterProps) {
  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function selectAll() {
    onSelectedChange(new Set(participants.map((p) => p.id)));
  }

  function selectNone() {
    onSelectedChange(new Set());
  }

  const hasHighlight = highlightedIds && highlightedIds.size > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">참여자</span>
        <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline cursor-pointer">
          전체
        </button>
        <button onClick={selectNone} className="text-xs text-gray-400 hover:underline cursor-pointer">
          해제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => {
          const selected = selectedIds.has(p.id);
          const highlighted = hasHighlight && highlightedIds!.has(p.id);
          const dimmed = hasHighlight && !highlighted;

          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHoverEnd?.()}
              className={`px-3 py-1 text-sm rounded-full transition-all cursor-pointer
                ${selected
                  ? highlighted
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : dimmed
                      ? 'bg-indigo-50 text-indigo-300'
                      : 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-400'}`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
