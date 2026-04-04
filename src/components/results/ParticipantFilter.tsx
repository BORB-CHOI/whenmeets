'use client';

interface ParticipantFilterProps {
  participants: { id: string; name: string }[];
  selectedIds: Set<string>;
  onSelectedChange: (ids: Set<string>) => void;
  onHover?: (participantId: string) => void;
  onHoverEnd?: () => void;
}

export default function ParticipantFilter({
  participants,
  selectedIds,
  onSelectedChange,
  onHover,
  onHoverEnd,
}: ParticipantFilterProps) {
  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  }

  function selectAll() {
    onSelectedChange(new Set(participants.map((p) => p.id)));
  }

  function selectNone() {
    onSelectedChange(new Set());
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-600">참여자</span>
        <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">
          전체
        </button>
        <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">
          해제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            onMouseEnter={() => onHover?.(p.id)}
            onMouseLeave={() => onHoverEnd?.()}
            className={`px-3 py-1 text-sm rounded-full transition-colors
              ${selectedIds.has(p.id)
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-400'}`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
