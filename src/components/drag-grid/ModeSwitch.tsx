'use client';

import { AvailabilityLevel } from '@/lib/types';

const MODES: { value: AvailabilityLevel; label: string }[] = [
  { value: 2, label: 'Available' },
  { value: 1, label: 'If Needed' },
  { value: 0, label: 'Unavailable' },
];

interface ModeSwitchProps {
  activeMode: AvailabilityLevel;
  onModeChange: (mode: AvailabilityLevel) => void;
}

export default function ModeSwitch({ activeMode, onModeChange }: ModeSwitchProps) {
  const activeIndex = MODES.findIndex((m) => m.value === activeMode);

  return (
    <div className="relative flex p-1 bg-gray-50 border border-gray-200 rounded-full">
      {/* Animated sliding indicator */}
      <div
        className="absolute top-1 bottom-1 bg-white border border-indigo-600 rounded-full shadow-sm transition-all duration-350"
        style={{
          width: `calc(${100 / MODES.length}% - 4px)`,
          left: `calc(${(activeIndex * 100) / MODES.length}% + 2px)`,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onModeChange(mode.value)}
          className={`relative z-10 flex-1 px-3 py-1.5 text-sm rounded-full transition-colors duration-200
            ${activeMode === mode.value ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
