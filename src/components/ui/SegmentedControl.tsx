'use client';

import { useState } from 'react';

type SegmentedVariant = 'default' | 'danger' | 'warning';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; variant?: SegmentedVariant }[];
  value: T;
  onChange: (value: T) => void;
}

const GLOW: Record<SegmentedVariant, string> = {
  default: '0 0 0 1.5px rgba(0, 137, 123, 0.25), 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0, 137, 123, 0.1)',
  danger: '0 0 0 1.5px rgba(220, 38, 38, 0.18), 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(220, 38, 38, 0.08)',
  warning: '0 0 0 1.5px rgba(217, 119, 6, 0.18), 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(252, 211, 77, 0.12)',
};

const TEXT: Record<SegmentedVariant, string> = {
  default: 'text-teal-700',
  danger: 'text-red-700',
  warning: 'text-amber-700',
};

// active indicator 배경 — variant별 옅은 톤
const INDICATOR_BG: Record<SegmentedVariant, string> = {
  default: 'bg-white',
  danger: 'bg-red-50',
  warning: 'bg-amber-50',
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const [animate, setAnimate] = useState(false);
  const activeIndex = options.findIndex((o) => o.value === value);
  const safeActiveIndex = Math.max(0, activeIndex);
  const activeVariant = options[activeIndex]?.variant || 'default';

  const segmentCount = Math.max(1, options.length);

  return (
    <div
      className="relative grid p-1 bg-gray-100 rounded-lg border border-gray-200 w-full"
      style={{ gridTemplateColumns: `repeat(${segmentCount}, minmax(0, 1fr))` }}
    >
      <div
        className={`absolute top-1 bottom-1 ${INDICATOR_BG[activeVariant]} rounded-md ${
          animate ? 'transition-transform duration-200 ease-out' : ''
        }`}
        style={{
          left: 4,
          width: `calc((100% - 8px) / ${segmentCount})`,
          transform: `translateX(${safeActiveIndex * 100}%)`,
          boxShadow: GLOW[activeVariant],
        }}
      />
      {options.map((option) => {
        const isActive = value === option.value;
        const v = option.variant || 'default';
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setAnimate(true);
              onChange(option.value);
            }}
            className={`relative z-10 flex-1 text-center px-4 py-2 text-sm whitespace-nowrap rounded-md transition-colors duration-150 cursor-pointer
              ${isActive ? `${TEXT[v]} font-semibold` : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
