'use client';

import { motion } from 'framer-motion';
import { getStepColor, getStepLabels, type HeatmapStep } from '@/lib/heatmap';
import type { EventMode } from '@/lib/types';

interface HeatmapLegendProps {
  total: number;
  mode: EventMode;
}

// 0 단계(빈 칸 = unavailable)도 범례에 명시
const STEPS: HeatmapStep[] = [0, 1, 2, 3, 4, 5];

export default function HeatmapLegend({ total, mode }: HeatmapLegendProps) {
  if (total === 0) return null;

  // labels는 step 1~5 에 대응. step 0 라벨은 "0" 으로 prepend.
  const labels = ['0', ...getStepLabels(total)];
  const caption = mode === 'unavailable' ? '안 되는 사람' : '되는 사람';

  return (
    <div className="flex items-end gap-3 px-1 py-2 text-gray-500">
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-[2px]">
          {STEPS.map((s) => (
            <div
              key={s}
              data-step={s}
              className={`w-3 h-3 rounded-sm ${s === 0 ? 'border border-gray-200 dark:border-gray-700' : ''}`}
              style={{ backgroundColor: s === 0 ? undefined : getStepColor(s) }}
            />
          ))}
        </div>
        <div className="flex gap-[2px]">
          {labels.map((label, i) => (
            <motion.span
              key={`${i}-${label}`}
              className="w-3 text-[10px] tabular-nums text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.span>
          ))}
        </div>
      </div>
      <span className="text-[10px] text-gray-400 self-center">{caption}</span>
    </div>
  );
}
