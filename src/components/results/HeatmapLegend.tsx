'use client';

import { getStepColor, getStep, type HeatmapStep } from '@/lib/heatmap';

interface HeatmapLegendProps {
  total: number;
}

export default function HeatmapLegend({ total }: HeatmapLegendProps) {
  if (total === 0) return null;

  const items = [
    { step: 0 as HeatmapStep, label: '0' },
    ...Array.from({ length: total }, (_, i) => i + 1).reduce<
      { step: HeatmapStep; label: string; min: number; max: number }[]
    >((buckets, count) => {
      const step = getStep(count, total);
      const last = buckets[buckets.length - 1];
      if (last?.step === step) {
        last.max = count;
      } else {
        buckets.push({ step, label: '', min: count, max: count });
      }
      return buckets;
    }, []).map(({ step, min, max }) => ({
      step,
      label: min === max ? String(min) : `${min}+`,
    })),
  ];

  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {items.map(({ step, label }) => {
        const s = step;
        const isEmpty = s === 0;
        const isDarkBg = s >= 3;
        return (
          <div
            key={s}
            data-step={s}
            className={`flex items-center justify-center rounded-sm tabular-nums leading-none ${
              isEmpty ? 'border border-gray-300 dark:border-gray-600' : ''
            }`}
            style={{
              backgroundColor: isEmpty ? undefined : getStepColor(s),
              minWidth: 32,
              height: 22,
              padding: '0 6px',
            }}
          >
            <span
              className="text-[11px] font-semibold"
              style={{ color: isEmpty ? '#9CA3AF' : isDarkBg ? '#FFFFFF' : '#00695C' }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
