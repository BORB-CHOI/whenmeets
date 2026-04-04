'use client';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; variant?: 'default' | 'danger' }[];
  value: T;
  onChange: (value: T) => void;
}

const GLOW = {
  default: '0 0 0 1.5px rgba(5, 150, 105, 0.25), 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(5, 150, 105, 0.1)',
  danger: '0 0 0 1.5px rgba(220, 38, 38, 0.25), 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(220, 38, 38, 0.1)',
};

const TEXT = {
  default: 'text-emerald-700',
  danger: 'text-red-700',
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);
  const activeVariant = options[activeIndex]?.variant || 'default';

  return (
    <div className="relative flex p-1 bg-gray-100 rounded-lg border border-gray-200">
      <div
        className="absolute top-1 bottom-1 bg-white rounded-md transition-all duration-200 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: `calc(${(activeIndex * 100) / options.length}% + 2px)`,
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
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex-1 px-3 py-2 text-sm rounded-md transition-colors duration-150 cursor-pointer
              ${isActive ? `${TEXT[v]} font-semibold` : 'text-gray-400 hover:text-gray-600'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
