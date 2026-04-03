'use client';

import { AvailabilityLevel } from '@/lib/types';

const MODES: { value: AvailabilityLevel; label: string; color: string; activeColor: string }[] = [
  { value: 2, label: '가능', color: 'bg-emerald-100 text-emerald-700', activeColor: 'bg-emerald-500 text-white' },
  { value: 1, label: '되면 가능', color: 'bg-amber-100 text-amber-700', activeColor: 'bg-amber-400 text-white' },
  { value: 0, label: '불가능', color: 'bg-gray-100 text-gray-600', activeColor: 'bg-gray-500 text-white' },
];

interface ModeSwitchProps {
  activeMode: AvailabilityLevel;
  onModeChange: (mode: AvailabilityLevel) => void;
}

export default function ModeSwitch({ activeMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onModeChange(mode.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${activeMode === mode.value ? mode.activeColor : mode.color}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
