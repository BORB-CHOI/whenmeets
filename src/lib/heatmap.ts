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

function formatRange(lo: number, hi: number): string {
  if (lo > hi) return '';
  if (lo === hi) return `${lo}`;
  return `${lo}+`;
}

export function getStepLabels(total: number): string[] {
  if (total === 0) return [];
  const q1 = Math.ceil(total / 4);
  const q2 = Math.ceil(total / 2);
  const q3 = Math.ceil((3 * total) / 4);
  // count === total always maps to step 5 (see getStep), so cap each
  // intermediate step at total - 1. Without this, total=1 produces ['1','','','','1']
  // which renders the legend with two "1" buckets — same number, different colors.
  const cap = total - 1;
  return [
    formatRange(1, Math.min(q1, cap)),
    formatRange(q1 + 1, Math.min(q2, cap)),
    formatRange(q2 + 1, Math.min(q3, cap)),
    formatRange(q3 + 1, cap),
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
