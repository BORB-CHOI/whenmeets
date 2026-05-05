export type HeatmapStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_COLORS: Record<HeatmapStep, string> = {
  0: '',
  1: '#E0F2F1',
  2: '#B2DFDB',
  3: '#4DB6AC',
  4: '#00897B',
  5: '#00695C',
};

export function getStep(count: number, total: number): HeatmapStep {
  if (total === 0 || count === 0) return 0;
  if (count === total) return 5;
  const q1 = Math.ceil(total / 4);
  const q2 = Math.ceil(total / 2);
  const q3 = Math.ceil((3 * total) / 4);
  if (count <= q1) return 1;
  if (count <= q2) return 2;
  if (count <= q3) return 3;
  return 4;
}

export function getStepColor(step: HeatmapStep): string {
  return STEP_COLORS[step];
}

export function getCellColor(count: number, total: number): string {
  return getStepColor(getStep(count, total));
}

export function getStepLabels(total: number): string[] {
  if (total === 0) return [];
  const q1 = Math.ceil(total / 4);
  const q2 = Math.ceil(total / 2);
  const q3 = Math.ceil((3 * total) / 4);
  return [
    '1+',
    `${q1 + 1}+`,
    `${q2 + 1}+`,
    `${q3 + 1}+`,
    `${total}`,
  ];
}

interface ResolveCellColorArgs {
  count: number;
  total: number;
  isBest: boolean;
  hasBestSlots: boolean;
}

export function resolveCellColor({ count, total, isBest, hasBestSlots }: ResolveCellColorArgs): string | undefined {
  if (hasBestSlots) {
    return isBest ? getStepColor(5) : undefined;
  }
  const step = getStep(count, total);
  if (step === 0) return undefined;
  return getStepColor(step);
}
