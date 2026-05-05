'use client';

import { useMemo } from 'react';
import { AvailabilityLevel, EventMode } from '@/lib/types';

const ALL_MODES: { value: AvailabilityLevel; label: string; color: string }[] = [
  { value: 2, label: 'Available', color: 'bg-teal-400/60' },
  { value: 1, label: 'If Needed', color: 'bg-amber-300/50' },
  { value: 0, label: 'Unavailable', color: 'bg-red-400/50' },
];

interface ModeSwitchProps {
  activeMode: AvailabilityLevel;
  onModeChange: (mode: AvailabilityLevel) => void;
  eventMode?: EventMode;
}

export default function ModeSwitch({ activeMode, onModeChange, eventMode = 'available' }: ModeSwitchProps) {
  // For "unavailable" events: show Unavailable + If Needed (no Available)
  // For "available" events: show Available + If Needed (no Unavailable)
  const modes = useMemo(() => {
    if (eventMode === 'unavailable') {
      return ALL_MODES.filter((m) => m.value === 0);
    }
    return ALL_MODES.filter((m) => m.value === 2 || m.value === 1);
  }, [eventMode]);

  return (
    <div className="flex gap-1.5">
      {modes.map((mode) => {
        const active = activeMode === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer border
              ${active
                ? `${mode.color} border-gray-300 shadow-sm text-gray-900 font-semibold`
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
          >
            <span className={`w-3 h-3 rounded-sm ${mode.color} border border-gray-200/50`} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
