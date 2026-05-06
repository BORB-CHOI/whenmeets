'use client';

import { getStepColor, getStepLabels, type HeatmapStep } from '@/lib/heatmap';

interface HeatmapLegendProps {
  total: number;
}

const STEPS: HeatmapStep[] = [0, 1, 2, 3, 4, 5];

export default function HeatmapLegend({ total }: HeatmapLegendProps) {
  if (total === 0) return null;

  const labels = ['0', ...getStepLabels(total)];

  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {STEPS.map((s, i) => {
        const label = labels[i];
        if (!label) return null;
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
