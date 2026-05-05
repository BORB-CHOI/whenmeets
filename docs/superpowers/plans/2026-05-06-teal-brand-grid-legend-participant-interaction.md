# v3 Teal Brand / Grid Legend / Participant Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브랜드 컬러를 Material teal로 전환하고, 그리드 5단계 범례·편집 모드 미선택 자동 반대색·응답자 클릭/호버 단독 미리보기를 추가한다.

**Architecture:** 4개 PR 순차 머지. PR1 컬러 토큰 인프라(시각만 변경, 동작 동일) → PR2 그리드 단계 + 범례 → PR3 편집 미선택 셀 → PR4 응답자 인터랙션. 각 PR은 main에서 분기, 독립 배포 가능.

**Tech Stack:** Next.js 16+, React 19, Tailwind v4 (`@theme` 디렉티브), TypeScript, Vitest, Playwright, framer-motion.

**Spec:** [`docs/superpowers/specs/2026-05-06-teal-brand-grid-legend-participant-interaction-design.md`](../specs/2026-05-06-teal-brand-grid-legend-participant-interaction-design.md)

---

## Phase 1 (PR1) — 컬러 토큰 인프라

브랜치: `feat/v3-teal-redesign-pr1-color-tokens` (main 분기)
머지 대상: `main`
검증: 시각 회귀 (수동 + Playwright 스크린샷)

### Task 1.1: globals.css 토큰 갱신 + Tailwind teal scale 재정의

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 현재 상태 확인**

```bash
grep -n "color-primary\|shadow-primary\|@theme" src/app/globals.css
```

기존 `:root` 블록의 `--color-primary` `#059669`, `--color-primary-hover` `#047857`, `--shadow-primary` 등을 확인.

- [ ] **Step 2: light 모드 토큰 갱신**

`:root` 블록의 4개 토큰을 다음으로 교체:

```css
:root {
  --color-primary: #00897B;
  --color-primary-hover: #00695C;
  --shadow-primary: 0px 2px 8px rgba(0, 137, 123, 0.5);
  --shadow-primary-hover: 0px 4px 12px rgba(0, 137, 123, 0.4);
  /* 나머지 기존 변수 유지 */
}
```

- [ ] **Step 3: dark 모드 토큰 갱신**

`.dark` (또는 `@media (prefers-color-scheme: dark)`) 블록의 토큰 교체:

```css
  --color-primary: #4DB6AC;
  --color-primary-hover: #80CBC4;
  --shadow-primary: 0px 2px 8px rgba(77, 182, 172, 0.3);
  --shadow-primary-hover: 0px 4px 12px rgba(77, 182, 172, 0.25);
```

- [ ] **Step 4: Tailwind v4 `@theme` 블록에 Material teal scale 재정의**

파일 상단 (또는 `:root` 위) 에 추가. 이미 `@theme` 블록이 있으면 그 안에 병합:

```css
@theme {
  --color-teal-50:  #E0F2F1;
  --color-teal-100: #B2DFDB;
  --color-teal-200: #80CBC4;
  --color-teal-300: #4DB6AC;
  --color-teal-400: #26A69A;
  --color-teal-500: #009688;
  --color-teal-600: #00897B;
  --color-teal-700: #00796B;
  --color-teal-800: #00695C;
  --color-teal-900: #004D40;
}
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공. teal 변수 인식.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: Material teal 토큰 + Tailwind teal scale 재정의"
```

### Task 1.2: AVAILABILITY_COLORS 갱신

**Files:**
- Modify: `src/lib/constants.ts:7-11`

- [ ] **Step 1: 색상 매핑 변경**

```ts
export const AVAILABILITY_COLORS = {
  0: 'bg-gray-100',           // Unavailable / empty
  1: 'bg-amber-300',          // If needed
  2: 'bg-teal-600/[.47]',     // Available (was bg-emerald-600/[.47])
} as const;
```

- [ ] **Step 2: type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "refactor: AVAILABILITY_COLORS emerald → teal"
```

### Task 1.3: 코드베이스 emerald → teal 일괄 치환

**Files:**
- Modify: 28개 파일 (HeatmapGrid, CalendarHeatmapGrid, GridCell, EventPageClient, ResultsPageClient, layout/*, ui/*, event-form/*, event-page/*, drag-grid/*, dashboard/*, auth/*, mypage/*, app/page.tsx, app/not-found.tsx, app/e/[id]/page.tsx)

- [ ] **Step 1: 매치 파일 목록 출력**

```bash
rg -l "emerald|#059669|#10B981|#34D399" src/
```

기록해둘 것: 32 파일 (constants.ts·globals.css는 이미 처리, heatmap-helpers.test.ts는 Phase 2에서 다룸).

- [ ] **Step 2: bash 스크립트로 일괄 치환**

```bash
rg -l "emerald|#059669|#10B981|#34D399" src/ | while read f; do
  sed -i.bak \
    -e 's/bg-emerald-50/bg-teal-50/g' \
    -e 's/bg-emerald-100/bg-teal-100/g' \
    -e 's/bg-emerald-200/bg-teal-200/g' \
    -e 's/bg-emerald-300/bg-teal-300/g' \
    -e 's/bg-emerald-400/bg-teal-400/g' \
    -e 's/bg-emerald-500/bg-teal-500/g' \
    -e 's/bg-emerald-600/bg-teal-600/g' \
    -e 's/bg-emerald-700/bg-teal-700/g' \
    -e 's/bg-emerald-800/bg-teal-800/g' \
    -e 's/bg-emerald-900/bg-teal-900/g' \
    -e 's/text-emerald-/text-teal-/g' \
    -e 's/border-emerald-/border-teal-/g' \
    -e 's/ring-emerald-/ring-teal-/g' \
    -e 's/outline-emerald-/outline-teal-/g' \
    -e 's/from-emerald-/from-teal-/g' \
    -e 's/to-emerald-/to-teal-/g' \
    -e 's/via-emerald-/via-teal-/g' \
    -e 's/hover:bg-emerald-/hover:bg-teal-/g' \
    -e 's/hover:text-emerald-/hover:text-teal-/g' \
    -e 's/hover:border-emerald-/hover:border-teal-/g' \
    -e 's/focus:bg-emerald-/focus:bg-teal-/g' \
    -e 's/focus:ring-emerald-/focus:ring-teal-/g' \
    -e 's/dark:bg-emerald-/dark:bg-teal-/g' \
    -e 's/dark:text-emerald-/dark:text-teal-/g' \
    -e 's/dark:border-emerald-/dark:border-teal-/g' \
    -e 's/dark:hover:bg-emerald-/dark:hover:bg-teal-/g' \
    -e 's/#059669/#00897B/g' \
    -e 's/#10B981/#26A69A/g' \
    -e 's/#10b981/#26a69a/g' \
    -e 's/#34D399/#4DB6AC/g' \
    -e 's/#34d399/#4db6ac/g' \
    -e 's/#047857/#00695C/g' \
    -e 's/#6ee7b7/#80CBC4/g' \
    -e 's/rgba(5, ?150, ?105/rgba(0, 137, 123/g' \
    -e 's/rgba(52, ?211, ?153/rgba(77, 182, 172/g' \
    "$f"
  rm -f "$f.bak"
done
```

(Windows: PowerShell `Get-ChildItem` + `-replace` 사용 가능. WSL/git-bash 권장.)

- [ ] **Step 3: 잔여 emerald 검색**

```bash
rg "emerald|#059669|#10B981|#34D399|#047857|#6ee7b7" src/
```

Expected: 0 매치. 매치 발견 시 수동 검토 (raw rgba alpha 등). HeatmapGrid의 `rgba(5,150,105,0.7)` 같은 인라인 스타일도 확인:

```bash
rg "5,150,105\|5, 150, 105" src/
```

매치 발견 시 `rgba(0,137,123,...)` 로 수동 변경.

- [ ] **Step 4: type-check + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 통과.

- [ ] **Step 5: 시각 검증**

```bash
npm run dev
```

브라우저에서 다음 페이지 시각 확인:
- `/` (홈)
- `/dashboard` (있다면)
- `/e/[id]` (이벤트 페이지 — view·edit·result 모드)
- `/mypage`

이전 emerald 톤이 모두 teal로 바뀌었고 깨진 부분 없는지.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: emerald 클래스 + raw hex teal 일괄 치환 (28 파일)"
```

### Task 1.4: PR1 push + PR 생성

- [ ] **Step 1: 브랜치 push**

```bash
git push -u origin feat/v3-teal-redesign-pr1-color-tokens
```

- [ ] **Step 2: PR 생성**

```bash
gh pr create --title "feat: PR1 — Material teal 브랜드 컬러 전환" --body "$(cat <<'EOF'
## Summary
- globals.css에 Material teal CSS 변수 + Tailwind v4 `@theme` 로 teal scale 재정의
- 코드베이스 emerald 클래스 + raw hex 일괄 치환 (28 파일)
- 시각만 변경, 동작 동일

## Test plan
- [ ] 홈, 대시보드, 이벤트 페이지 (view/edit/result 모드), 마이페이지 시각 확인
- [ ] 다크 모드 토글 시 teal 톤 유지 확인
- [ ] 빌드 / type-check / lint 통과
EOF
)"
```

---

## Phase 2 (PR2) — 그리드 5단계 + 범례

브랜치: `feat/v3-teal-redesign-pr2-grid-legend` (main 분기, PR1 머지 후)

### Task 2.1: 5단계 알고리즘 — TDD test 작성

**Files:**
- Modify: `src/lib/__tests__/heatmap-helpers.test.ts`

- [ ] **Step 1: 기존 getColor 테스트 제거 + getStep 테스트 추가**

`getColor` 4단계 테스트 블록을 `getStep` 5단계 테스트로 교체:

```ts
function getStep(count: number, total: number): 0 | 1 | 2 | 3 | 4 | 5 {
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

describe('getStep', () => {
  it('returns 0 when total is 0', () => {
    expect(getStep(5, 0)).toBe(0);
  });

  it('returns 0 when count is 0', () => {
    expect(getStep(0, 5)).toBe(0);
  });

  it('returns 5 when count equals total (만점)', () => {
    expect(getStep(5, 5)).toBe(5);
    expect(getStep(12, 12)).toBe(5);
  });

  describe('N=12 (사진 패턴 매칭)', () => {
    it('1-3 → step 1', () => {
      expect(getStep(1, 12)).toBe(1);
      expect(getStep(3, 12)).toBe(1);
    });
    it('4-6 → step 2', () => {
      expect(getStep(4, 12)).toBe(2);
      expect(getStep(6, 12)).toBe(2);
    });
    it('7-9 → step 3', () => {
      expect(getStep(7, 12)).toBe(3);
      expect(getStep(9, 12)).toBe(3);
    });
    it('10-11 → step 4', () => {
      expect(getStep(10, 12)).toBe(4);
      expect(getStep(11, 12)).toBe(4);
    });
    it('12 → step 5', () => {
      expect(getStep(12, 12)).toBe(5);
    });
  });

  describe('N=4', () => {
    it('1 → step 1, 2 → step 2, 3 → step 3, 4 → step 5', () => {
      expect(getStep(1, 4)).toBe(1);
      expect(getStep(2, 4)).toBe(2);
      expect(getStep(3, 4)).toBe(3);
      expect(getStep(4, 4)).toBe(5);
    });
  });

  describe('N=2', () => {
    it('1 → step 1, 2 → step 5', () => {
      expect(getStep(1, 2)).toBe(1);
      expect(getStep(2, 2)).toBe(5);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — RED**

```bash
npx vitest run src/lib/__tests__/heatmap-helpers.test.ts
```

Expected: FAIL — `getStep` undefined (모듈 분리 시) 또는 inline OK.

### Task 2.2: 5단계 알고리즘 lib 모듈 작성

**Files:**
- Create: `src/lib/heatmap.ts`

- [ ] **Step 1: 함수 구현**

```ts
export type HeatmapStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEP_COLORS: Record<HeatmapStep, string> = {
  0: '',          // empty / no fill
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
```

- [ ] **Step 2: 테스트 import + getStepLabels test 추가**

`heatmap-helpers.test.ts` 상단에 import 추가하고 inline `getStep` 정의 제거:

```ts
import { getStep, getStepLabels } from '@/lib/heatmap';
```

라벨 테스트 추가:

```ts
describe('getStepLabels', () => {
  it('N=12 → 사진 패턴 [1+, 4+, 7+, 10+, 12]', () => {
    expect(getStepLabels(12)).toEqual(['1+', '4+', '7+', '10+', '12']);
  });

  it('N=4 → [1+, 2+, 3+, 4+, 4]', () => {
    expect(getStepLabels(4)).toEqual(['1+', '2+', '3+', '4+', '4']);
  });

  it('N=0 → 빈 배열', () => {
    expect(getStepLabels(0)).toEqual([]);
  });
});
```

- [ ] **Step 3: 테스트 GREEN**

```bash
npx vitest run src/lib/__tests__/heatmap-helpers.test.ts
```

Expected: 모든 테스트 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/heatmap.ts src/lib/__tests__/heatmap-helpers.test.ts
git commit -m "feat: 그리드 5단계 알고리즘 + 라벨 계산 (heatmap.ts)"
```

### Task 2.3: HeatmapGrid 5단계 적용

**Files:**
- Modify: `src/components/results/HeatmapGrid.tsx`

- [ ] **Step 1: BASE_COLOR / hexAlpha / computeCellColor 제거**

```ts
// 삭제:
const BASE_COLOR = '#059669';
function hexAlpha(alpha: number): string { ... }
function computeCellColor(count: number, total: number): string | undefined { ... }
```

- [ ] **Step 2: getStep / getStepColor import**

```ts
import { getStep, getStepColor } from '@/lib/heatmap';
```

- [ ] **Step 3: renderCell 내부 색 계산 변경**

```tsx
// 변경 전:
let bgColor: string | undefined;
if (hasBestSlots) {
  bgColor = isBest ? BASE_COLOR : undefined;
} else {
  bgColor = computeCellColor(count, total);
}

// 변경 후:
let bgColor: string | undefined;
if (hasBestSlots) {
  bgColor = isBest ? getStepColor(5) : undefined;  // best는 step 5 (#00695C)
} else {
  const step = getStep(count, total);
  bgColor = step === 0 ? undefined : getStepColor(step);
}
```

- [ ] **Step 4: 카운트 라벨 색 분기 갱신**

기존:
```tsx
style={{ color: (hasBestSlots && isBest) || count === total ? 'rgba(255,255,255,0.92)' : 'rgba(5,150,105,0.7)' }}
```

변경:
```tsx
style={{ color: (hasBestSlots && isBest) || count === total ? 'rgba(255,255,255,0.92)' : 'rgba(0,137,123,0.7)' }}
```

(이미 PR1에서 일괄 치환되었으면 변경 불필요. 잔여 검색 권장.)

- [ ] **Step 5: type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/results/HeatmapGrid.tsx
git commit -m "refactor: HeatmapGrid 연속 알파 → 5단계 lookup"
```

### Task 2.4: CalendarHeatmapGrid 5단계 적용

**Files:**
- Modify: `src/components/results/CalendarHeatmapGrid.tsx`

- [ ] **Step 1: 동일 패턴 적용**

`HeatmapGrid` 와 같은 알파 그라데이션 로직이 있을 것. `getStep`/`getStepColor` 로 교체.

- [ ] **Step 2: type-check + 시각 확인 (캘린더 모드 이벤트 페이지)**

```bash
npx tsc --noEmit && npm run dev
```

캘린더 모드 이벤트 페이지에서 결과 그리드 확인.

- [ ] **Step 3: Commit**

```bash
git add src/components/results/CalendarHeatmapGrid.tsx
git commit -m "refactor: CalendarHeatmapGrid 5단계 lookup"
```

### Task 2.5: HeatmapLegend 컴포넌트 + test

**Files:**
- Create: `src/components/results/HeatmapLegend.tsx`
- Create: `src/components/results/__tests__/HeatmapLegend.test.tsx`

- [ ] **Step 1: 테스트 먼저 작성**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeatmapLegend from '../HeatmapLegend';

describe('HeatmapLegend', () => {
  it('total=0 → 렌더 안 함', () => {
    const { container } = render(<HeatmapLegend total={0} mode="available" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('total=12 → 5개 박스 + 사진 라벨 [1+, 4+, 7+, 10+, 12]', () => {
    render(<HeatmapLegend total={12} mode="available" />);
    expect(screen.getByText('1+')).toBeInTheDocument();
    expect(screen.getByText('4+')).toBeInTheDocument();
    expect(screen.getByText('7+')).toBeInTheDocument();
    expect(screen.getByText('10+')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('color box 5개 렌더', () => {
    const { container } = render(<HeatmapLegend total={12} mode="available" />);
    const boxes = container.querySelectorAll('[data-step]');
    expect(boxes).toHaveLength(5);
  });
});
```

- [ ] **Step 2: 컴포넌트 작성**

```tsx
'use client';

import { motion } from 'framer-motion';
import { getStepColor, getStepLabels, type HeatmapStep } from '@/lib/heatmap';
import type { EventMode } from '@/lib/types';

interface HeatmapLegendProps {
  total: number;
  mode: EventMode;
}

export default function HeatmapLegend({ total, mode }: HeatmapLegendProps) {
  if (total === 0) return null;

  const labels = getStepLabels(total);
  const steps: HeatmapStep[] = [1, 2, 3, 4, 5];
  const caption = mode === 'unavailable' ? '안 되는 사람' : '되는 사람';

  return (
    <div className="flex items-end gap-3 px-1 py-2 text-gray-500">
      <div className="flex flex-col items-start gap-1">
        <div className="flex gap-[2px]">
          {steps.map((s, i) => (
            <div
              key={s}
              data-step={s}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getStepColor(s) }}
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
```

- [ ] **Step 3: 테스트 GREEN**

```bash
npx vitest run src/components/results/__tests__/HeatmapLegend.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/results/HeatmapLegend.tsx src/components/results/__tests__/HeatmapLegend.test.tsx
git commit -m "feat: HeatmapLegend 5단계 범례 컴포넌트"
```

### Task 2.6: ResultsPageClient에 범례 마운트

**Files:**
- Modify: `src/components/results/ResultsPageClient.tsx`

- [ ] **Step 1: HeatmapGrid 마운트 부분 찾기**

```bash
rg -n "HeatmapGrid|CalendarHeatmapGrid" src/components/results/ResultsPageClient.tsx
```

- [ ] **Step 2: HeatmapGrid 직상단에 HeatmapLegend 마운트**

```tsx
import HeatmapLegend from './HeatmapLegend';

// 기존:
<HeatmapGrid ... />

// 변경:
<>
  <HeatmapLegend total={selectedIds.size} mode={event.mode} />
  <HeatmapGrid ... />
</>
```

`total` 은 현재 선택된 응답자 수 (수합 분모). `event.mode` 는 EventMode 타입.

- [ ] **Step 3: 시각 확인**

이벤트 결과 페이지에서 그리드 위 5개 박스 + 라벨 확인.

- [ ] **Step 4: Commit**

```bash
git add src/components/results/ResultsPageClient.tsx
git commit -m "feat: 결과 페이지 그리드 위 5단계 범례 마운트"
```

### Task 2.7: EventPageClient view 모드 범례 마운트

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx`

- [ ] **Step 1: view 모드에서 HeatmapGrid 부분 찾기 + 범례 마운트**

(ResultsPageClient와 동일 패턴 적용. view 모드일 때만 HeatmapLegend 렌더.)

- [ ] **Step 2: type-check + 시각 확인**

- [ ] **Step 3: Commit**

```bash
git add src/components/event-page/EventPageClient.tsx
git commit -m "feat: 이벤트 페이지 view 모드 범례 마운트"
```

### Task 2.8: PR2 push + PR 생성

- [ ] **Step 1**

```bash
git push -u origin feat/v3-teal-redesign-pr2-grid-legend
gh pr create --title "feat: PR2 — 그리드 5단계 + 범례" --body "$(cat <<'EOF'
## Summary
- `lib/heatmap.ts` — getStep/getStepColor/getStepLabels 5단계 알고리즘
- HeatmapGrid + CalendarHeatmapGrid 알파 그라데이션 → 5단계 lookup 교체
- HeatmapLegend 신규 (그리드 위 5박스 + 인원수 임계 라벨)
- ResultsPageClient + EventPageClient view 모드에 마운트

## Test plan
- [ ] N=12 응답자 시 라벨 [1+, 4+, 7+, 10+, 12] 정확히 표시
- [ ] N=4, N=2 등 적은 응답자 케이스 색상 단계 동작
- [ ] best 토글 ON 시 best 외 흰색 유지 (회귀 없음)
- [ ] 단위 테스트 통과
EOF
)"
```

---

## Phase 3 (PR3) — 편집 모드 미선택 셀 자동 반대색

브랜치: `feat/v3-teal-redesign-pr3-edit-cell-color`

### Task 3.1: GridCell 색상 함수 — TDD test

**Files:**
- Create: `src/components/drag-grid/__tests__/getCellColor.test.ts`

- [ ] **Step 1: test 작성**

```ts
import { describe, it, expect } from 'vitest';
import { getCellColorClass } from '../GridCell';

describe('getCellColorClass — available 모드', () => {
  it('-1 (미선택) = red-400/45', () => {
    expect(getCellColorClass(-1, 'available')).toBe('bg-red-400/45');
  });
  it('0 = red-400/45 (사실상 발생 X 이지만 동일)', () => {
    expect(getCellColorClass(0, 'available')).toBe('bg-red-400/45');
  });
  it('1 (if needed) = amber-300/55', () => {
    expect(getCellColorClass(1, 'available')).toBe('bg-amber-300/55');
  });
  it('2 (available) = teal-600/[.47]', () => {
    expect(getCellColorClass(2, 'available')).toBe('bg-teal-600/[.47]');
  });
});

describe('getCellColorClass — unavailable 모드', () => {
  it('-1 (미선택) = teal-600/[.47]', () => {
    expect(getCellColorClass(-1, 'unavailable')).toBe('bg-teal-600/[.47]');
  });
  it('0 (명시) = red-400/45', () => {
    expect(getCellColorClass(0, 'unavailable')).toBe('bg-red-400/45');
  });
});
```

- [ ] **Step 2: RED**

```bash
npx vitest run src/components/drag-grid/__tests__/getCellColor.test.ts
```

Expected: FAIL.

### Task 3.2: getCellColorClass + getCellCssColor 구현

**Files:**
- Modify: `src/components/drag-grid/GridCell.tsx:7-20`

- [ ] **Step 1: 기존 CELL_COLORS / CELL_CSS_COLORS 객체를 함수로 전환**

```ts
import { AvailabilityLevel, EventMode } from '@/lib/types';

// 삭제:
// export const CELL_COLORS: Record<AvailabilityLevel | -1, string> = { ... };
// export const CELL_CSS_COLORS: Record<AvailabilityLevel | -1, string> = { ... };

export function getCellColorClass(
  value: AvailabilityLevel | -1,
  eventMode: EventMode,
): string {
  if (eventMode === 'unavailable') {
    if (value === -1) return 'bg-teal-600/[.47]';
    if (value === 0) return 'bg-red-400/45';
    return '';
  }
  if (value === -1 || value === 0) return 'bg-red-400/45';
  if (value === 1) return 'bg-amber-300/55';
  if (value === 2) return 'bg-teal-600/[.47]';
  return '';
}

export function getCellCssColor(
  value: AvailabilityLevel | -1,
  eventMode: EventMode,
): string {
  if (eventMode === 'unavailable') {
    if (value === -1) return 'rgba(0,137,123,0.47)';
    if (value === 0) return 'rgba(248,113,113,0.45)';
    return '';
  }
  if (value === -1 || value === 0) return 'rgba(248,113,113,0.45)';
  if (value === 1) return 'rgba(252,211,77,0.55)';
  if (value === 2) return 'rgba(0,137,123,0.47)';
  return '';
}
```

- [ ] **Step 2: GridCell 컴포넌트 props에 eventMode 추가**

```ts
interface GridCellProps {
  // ... 기존
  eventMode: EventMode;
}

function GridCell({ ..., eventMode }: GridCellProps) {
  // ...
  className={`relative w-full h-full ${getCellColorClass(value, eventMode)} select-none cursor-pointer`}
  // ...
}
```

- [ ] **Step 3: wide 변형 (dateOnly) 도 동일 적용**

```ts
className={`relative w-full min-w-[200px] h-[40px] px-3 rounded-lg border border-gray-200 dark:border-gray-700 ${getCellColorClass(value, eventMode)} select-none cursor-pointer flex items-center justify-between`}
```

- [ ] **Step 4: GREEN**

```bash
npx vitest run src/components/drag-grid/__tests__/getCellColor.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/drag-grid/GridCell.tsx src/components/drag-grid/__tests__/getCellColor.test.ts
git commit -m "feat: GridCell eventMode별 미선택 자동 반대색"
```

### Task 3.3: DragGrid → GridCell eventMode 전달

**Files:**
- Modify: `src/components/drag-grid/DragGrid.tsx:130-145`

- [ ] **Step 1: renderCell 호출 시 eventMode prop 추가**

```tsx
renderCell={(date, slot, indices) => {
  const overlayCount = overlayTotal > 0 ? getOverlayCount(date, String(slot)) : 0;
  return (
    <GridCell
      key={`${date}-${slot}`}
      date={date}
      slot={slot}
      dateIdx={indices?.dateIdx}
      slotIdx={indices?.slotIdx}
      value={getCellValue(date, slot)}
      eventMode={eventMode}        // 추가
      overlayCount={overlayTotal > 0 ? overlayCount : undefined}
      overlayTotal={overlayTotal > 0 ? overlayTotal : undefined}
    />
  );
}}
```

- [ ] **Step 2: type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/drag-grid/DragGrid.tsx
git commit -m "feat: DragGrid eventMode → GridCell 전달"
```

### Task 3.4: useGridDrag 직접 페인트 동기화

**Files:**
- Modify: `src/components/drag-grid/useGridDrag.ts`

`useGridDrag` 가 `CELL_CSS_COLORS[baseVal]` 을 직접 참조해 DOM `style.backgroundColor` 를 변경. 이 부분을 새 함수에 맞춤.

- [ ] **Step 1: import 변경**

```ts
// 변경 전:
import { CELL_CSS_COLORS } from './GridCell';

// 변경 후:
import { getCellCssColor } from './GridCell';
```

- [ ] **Step 2: useGridDrag 시그니처에 eventMode 추가**

```ts
interface UseGridDragOptions {
  activeMode: AvailabilityLevel;
  availability: Availability;
  onAvailabilityChange: (a: Availability) => void;
  eventMode: EventMode;     // 추가
  disabled?: boolean;
}
```

- [ ] **Step 3: paintCell 함수 내부 색 조회 변경**

```ts
function paintCell(key: string, mode: PaintMode) {
  // ...
  if (mode === 'reset') {
    cellEl.style.backgroundColor = '';
    return;
  }
  if (mode === 'erase') {
    cellEl.style.backgroundColor = getCellCssColor(baseVal, eventMode) || '';
    return;
  }
  // mode === 'apply'
  cellEl.style.backgroundColor = getCellCssColor(activeMode, eventMode);
}
```

paintMode `'erase'` 에서 baseVal 이 -1 이면 빈 문자열이 아니라 미선택 자동 반대색이 깔리므로 자연스럽게 동작.

- [ ] **Step 4: DragGrid에서 useGridDrag 호출 시 eventMode 전달**

```ts
const { gridProps } = useGridDrag({
  activeMode,
  availability,
  onAvailabilityChange,
  eventMode,                // 추가
  disabled,
});
```

- [ ] **Step 5: type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: 시각 + 인터랙션 확인**

```bash
npm run dev
```

이벤트 페이지 edit 모드에서:
1. 빈 화면 진입 시 모든 셀이 옅은 빨강(available 모드) 또는 옅은 teal(unavailable 모드) 으로 깔림
2. 드래그로 칠하면 명시 색으로 변경
3. 드래그로 지우면 다시 미선택 자동 반대색

- [ ] **Step 7: Commit**

```bash
git add src/components/drag-grid/useGridDrag.ts src/components/drag-grid/DragGrid.tsx
git commit -m "feat: useGridDrag eventMode 인지하여 직접 페인트 동기화"
```

### Task 3.5: CalendarDragGrid도 동일 적용

**Files:**
- Modify: `src/components/drag-grid/CalendarDragGrid.tsx`

- [ ] **Step 1: GridCell 호출 + useGridDrag 호출에 eventMode 전달**

DragGrid와 동일 패턴. 기존 호출부 찾아 eventMode 전달.

- [ ] **Step 2: type-check + 캘린더 모드 시각 확인**

- [ ] **Step 3: Commit**

```bash
git add src/components/drag-grid/CalendarDragGrid.tsx
git commit -m "feat: CalendarDragGrid eventMode 전달"
```

### Task 3.6: PR3 push + PR 생성

```bash
git push -u origin feat/v3-teal-redesign-pr3-edit-cell-color
gh pr create --title "feat: PR3 — 편집 모드 미선택 셀 자동 반대색" --body "$(cat <<'EOF'
## Summary
- GridCell 의 CELL_COLORS / CELL_CSS_COLORS 객체를 eventMode 인자 받는 함수로 전환
- available 모드: -1=red-400/45, 0=red-400/45, 1=amber-300/55, 2=teal-600/[.47]
- unavailable 모드: -1=teal-600/[.47], 0=red-400/45
- DragGrid, CalendarDragGrid, useGridDrag 모두 eventMode 동기화

## Test plan
- [ ] available 모드 빈 화면 → 모든 셀 옅은 빨강 자동 표시
- [ ] unavailable 모드 빈 화면 → 모든 셀 teal 자동 표시
- [ ] 드래그 칠하기 / 지우기 직접 페인트 정확
- [ ] 단위 테스트 통과
EOF
)"
```

---

## Phase 4 (PR4) — 응답자 클릭/호버 인터랙션

브랜치: `feat/v3-teal-redesign-pr4-participant-interaction`

### Task 4.1: ParticipantFilter toggle 룰 — TDD test

**Files:**
- Create: `src/components/results/__tests__/participantToggle.test.ts`

- [ ] **Step 1: 순수 함수로 toggle 분리 + test**

```ts
import { describe, it, expect } from 'vitest';
import { toggleParticipant } from '../participantToggle';

const ALL = ['a', 'b', 'c', 'd'];

describe('toggleParticipant', () => {
  it('전체 선택 → A 클릭 = A 단독 (다른 모두 해제)', () => {
    const next = toggleParticipant(new Set(ALL), 'a', ALL);
    expect([...next]).toEqual(['a']);
  });

  it('A 단독 → B 클릭 = A+B 추가', () => {
    const next = toggleParticipant(new Set(['a']), 'b', ALL);
    expect([...next].sort()).toEqual(['a', 'b']);
  });

  it('A+B → A 클릭 = B만 (A 제거)', () => {
    const next = toggleParticipant(new Set(['a', 'b']), 'a', ALL);
    expect([...next]).toEqual(['b']);
  });

  it('A 단독 → A 클릭 = 모두 해제 → 자동 전체 복귀', () => {
    const next = toggleParticipant(new Set(['a']), 'a', ALL);
    expect([...next].sort()).toEqual([...ALL].sort());
  });
});
```

- [ ] **Step 2: RED**

```bash
npx vitest run src/components/results/__tests__/participantToggle.test.ts
```

### Task 4.2: toggleParticipant 함수 + ParticipantFilter 적용

**Files:**
- Create: `src/components/results/participantToggle.ts`
- Modify: `src/components/results/ParticipantFilter.tsx:63-68`

- [ ] **Step 1: 순수 함수 작성**

```ts
export function toggleParticipant(
  current: Set<string>,
  clickedId: string,
  allIds: string[],
): Set<string> {
  const allSelected = current.size === allIds.length;

  // 전체 선택 상태 → 클릭한 사람 단독
  if (allSelected) return new Set([clickedId]);

  const next = new Set(current);
  if (next.has(clickedId)) {
    next.delete(clickedId);
  } else {
    next.add(clickedId);
  }

  // 모두 해제 → 자동 전체 선택 복귀
  if (next.size === 0) return new Set(allIds);

  return next;
}
```

- [ ] **Step 2: ParticipantFilter 의 toggle 함수 교체**

```tsx
import { toggleParticipant } from './participantToggle';

// 기존 toggle 함수 삭제 후:
function toggle(id: string) {
  const allIds = participants.map((p) => p.id);
  onSelectedChange(toggleParticipant(selectedIds, id, allIds));
}
```

- [ ] **Step 3: GREEN**

```bash
npx vitest run src/components/results/__tests__/participantToggle.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/components/results/participantToggle.ts src/components/results/ParticipantFilter.tsx src/components/results/__tests__/participantToggle.test.ts
git commit -m "feat: ParticipantFilter 단독↔수합 토글 룰 (전체→단독→추가→복귀)"
```

### Task 4.3: HeatmapGrid 호버 단독 미리보기

**Files:**
- Modify: `src/components/results/HeatmapGrid.tsx`

- [ ] **Step 1: filtered 계산을 hovered 우선으로 변경**

```ts
// 기존:
const filtered = useMemo(
  () => participants.filter((p) => selectedIds.has(p.id)),
  [participants, selectedIds],
);

// 변경:
const filtered = useMemo(() => {
  if (hoveredParticipantId) {
    const hovered = participants.find((p) => p.id === hoveredParticipantId);
    return hovered ? [hovered] : [];
  }
  return participants.filter((p) => selectedIds.has(p.id));
}, [participants, selectedIds, hoveredParticipantId]);
```

- [ ] **Step 2: includeIfNeeded 호버 시 강제**

```ts
// 기존 cellStats 계산부:
const isAvailable = eventMode === 'unavailable'
  ? val !== 0
  : val === 2 || (val === 1 && includeIfNeeded);

// 변경:
const effectiveIncludeIfNeeded = hoveredParticipantId ? true : includeIfNeeded;
const isAvailable = eventMode === 'unavailable'
  ? val !== 0
  : val === 2 || (val === 1 && effectiveIncludeIfNeeded);
```

- [ ] **Step 3: cellStats.hovered outline 로직 제거**

```tsx
// 삭제:
{isHoveredAvailable && (
  <div className="absolute inset-0 bg-teal-500/20 ring-2 ring-inset ring-teal-400" />
)}
```

호버 미리보기는 cellStats.counts 자체가 그 사람 단독으로 변하므로 별도 outline 불필요.

- [ ] **Step 4: type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/results/HeatmapGrid.tsx
git commit -m "feat: HeatmapGrid 호버 시 그 사람 단독 미리보기 + If Needed 강제"
```

### Task 4.4: CalendarHeatmapGrid 동일 적용

**Files:**
- Modify: `src/components/results/CalendarHeatmapGrid.tsx`

- [ ] **Step 1: HeatmapGrid 와 같은 패턴 적용**

filtered, effectiveIncludeIfNeeded, hover outline 제거 동일.

- [ ] **Step 2: type-check**

- [ ] **Step 3: Commit**

```bash
git add src/components/results/CalendarHeatmapGrid.tsx
git commit -m "feat: CalendarHeatmapGrid 호버 단독 미리보기"
```

### Task 4.5: ResultsPageClient 상태 재구성

**Files:**
- Modify: `src/components/results/ResultsPageClient.tsx`

- [ ] **Step 1: userIncludeIfNeeded 분리 + effectiveIncludeIfNeeded 파생**

```tsx
// 기존:
const [includeIfNeeded, setIncludeIfNeeded] = useState(false);

// 변경:
const [userIncludeIfNeeded, setUserIncludeIfNeeded] = useState(false);
const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);

const effectiveIncludeIfNeeded =
  hoveredParticipantId !== null || selectedIds.size === 1
    ? true
    : userIncludeIfNeeded;
```

- [ ] **Step 2: ParticipantFilter onHover 핸들러 연결**

```tsx
<ParticipantFilter
  participants={...}
  selectedIds={selectedIds}
  onSelectedChange={setSelectedIds}
  onHover={(id) => setHoveredParticipantId(id)}
  onHoverEnd={() => setHoveredParticipantId(null)}
  // ...
/>
```

- [ ] **Step 3: HeatmapGrid에 hoveredParticipantId, includeIfNeeded 전달**

```tsx
<HeatmapGrid
  // ...
  includeIfNeeded={effectiveIncludeIfNeeded}
  hoveredParticipantId={hoveredParticipantId}
/>
```

- [ ] **Step 4: If Needed 토글 UI disabled 처리**

```tsx
<button
  disabled={selectedIds.size === 1}
  onClick={() => setUserIncludeIfNeeded(v => !v)}
  className={`... ${selectedIds.size === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  되면 가능 포함
</button>
```

(`If Needed` 토글 UI 위치는 코드 검토 시 확인. 현재 토글 컴포넌트 클래스명 그대로 활용.)

- [ ] **Step 5: type-check + 시각 확인**

```bash
npx tsc --noEmit && npm run dev
```

수동 확인:
- 1명 선택 시 If Needed 토글 disabled + 자동 ON
- 2명+ 선택 시 토글 활성
- PC에서 응답자 호버 시 그 사람만 단독 표시 (If Needed 포함)
- 호버 종료 시 원복

- [ ] **Step 6: Commit**

```bash
git add src/components/results/ResultsPageClient.tsx
git commit -m "feat: ResultsPageClient effectiveIncludeIfNeeded + 호버 상태"
```

### Task 4.6: EventPageClient 상태 재구성

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx`

- [ ] **Step 1: ResultsPageClient 와 동일 패턴 적용**

view 모드에서 ParticipantFilter / HeatmapGrid / CalendarHeatmapGrid 마운트 부분에 동일한 상태 + 핸들러 + 파생값 로직 추가.

- [ ] **Step 2: type-check + 시각 확인**

- [ ] **Step 3: Commit**

```bash
git add src/components/event-page/EventPageClient.tsx
git commit -m "feat: EventPageClient view 모드 호버 단독 + 자동 If Needed"
```

### Task 4.7: best 토글 우선순위 회귀 test

**Files:**
- Modify: `src/lib/__tests__/heatmap-helpers.test.ts`

- [ ] **Step 1: best ON + 호버/단독 우선순위 회귀 test**

(이는 HeatmapGrid 컴포넌트 통합 test가 아니라 알고리즘 분리 가능 여부 검토. 가능하면 분리, 어려우면 E2E로 대체.)

```ts
// HeatmapGrid 의 색 결정 로직을 별도 함수로 분리:
// resolveCellColor({ count, total, isBest, hasBestSlots }) → string | undefined

describe('resolveCellColor — best 우선순위', () => {
  it('hasBestSlots=true + isBest=true → step 5 색', () => {
    expect(resolveCellColor({ count: 3, total: 12, isBest: true, hasBestSlots: true }))
      .toBe('#00695C');
  });
  it('hasBestSlots=true + isBest=false → undefined (흰색)', () => {
    expect(resolveCellColor({ count: 12, total: 12, isBest: false, hasBestSlots: true }))
      .toBe(undefined);
  });
  it('hasBestSlots=false → 단계별 색', () => {
    expect(resolveCellColor({ count: 3, total: 12, isBest: false, hasBestSlots: false }))
      .toBe('#E0F2F1'); // step 1
  });
});
```

- [ ] **Step 2: HeatmapGrid 의 색 결정 부분을 위 함수로 추출**

`src/lib/heatmap.ts` 에 `resolveCellColor` 함수 추가.

- [ ] **Step 3: GREEN**

- [ ] **Step 4: Commit**

```bash
git add src/lib/heatmap.ts src/lib/__tests__/heatmap-helpers.test.ts src/components/results/HeatmapGrid.tsx
git commit -m "test: best 토글 우선순위 회귀 방지 + resolveCellColor 추출"
```

### Task 4.8: E2E test (Playwright)

**Files:**
- Create: `e2e/participant-interaction.spec.ts` (또는 기존 e2e 디렉토리에 추가)

- [ ] **Step 1: 시나리오 작성**

```ts
import { test, expect } from '@playwright/test';

test.describe('응답자 인터랙션', () => {
  test('1명 클릭 시 단독 모드 + If Needed 토글 disabled', async ({ page }) => {
    await page.goto('/e/<test-event-id>'); // seed 이벤트 ID 필요
    await page.click('[data-participant="bob"]');
    await expect(page.locator('[data-toggle="if-needed"]')).toBeDisabled();
  });

  test('PC 호버 시 그 사람 단독 미리보기', async ({ page }) => {
    await page.goto('/e/<test-event-id>');
    const before = await page.locator('[data-cell="2026-04-04-72"]').getAttribute('style');
    await page.hover('[data-participant="charlie"]');
    const after = await page.locator('[data-cell="2026-04-04-72"]').getAttribute('style');
    expect(before).not.toBe(after);
  });

  test('best 토글 ON 시 best 외 셀은 색 없음', async ({ page }) => {
    await page.goto('/e/<test-event-id>');
    await page.click('[data-toggle="best"]');
    const nonBest = page.locator('[data-cell="2026-04-04-100"]');
    await expect(nonBest).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
```

(seed 이벤트 ID 는 fixtures 또는 환경 변수로. 실패 시 시나리오 수정.)

- [ ] **Step 2: Playwright 실행**

```bash
npx playwright test e2e/participant-interaction.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add e2e/participant-interaction.spec.ts
git commit -m "test: 응답자 단독/호버/best E2E"
```

### Task 4.9: PR4 push + PR 생성

```bash
git push -u origin feat/v3-teal-redesign-pr4-participant-interaction
gh pr create --title "feat: PR4 — 응답자 클릭/호버 단독 + If Needed 자동" --body "$(cat <<'EOF'
## Summary
- `toggleParticipant` 룰: 전체→A 단독→A+B 추가→모두 해제 시 전체 복귀
- HeatmapGrid + CalendarHeatmapGrid 호버 시 그 사람 단독 미리보기 (filtered 임시 교체)
- effectiveIncludeIfNeeded: 호버 중 또는 selectedIds.size === 1 → 강제 true
- ResultsPageClient + EventPageClient 상태 재구성 + If Needed 토글 disabled
- best 토글 우선순위 회귀 방지 (resolveCellColor 추출 + 단위 테스트)
- Playwright E2E

## Test plan
- [ ] 1명 단독 시 If Needed 자동 ON + 토글 disabled
- [ ] 2명+ 시 사용자 토글 그대로
- [ ] PC 호버 시 그 사람 단독 미리보기 + 호버 종료 시 원복
- [ ] 모바일 호버 미동작 (long-press 추가 안 함)
- [ ] best ON 시 모든 상태에서 best 외 흰색 유지
- [ ] 단위 + E2E 테스트 통과
EOF
)"
```

---

## Self-Review

스펙 대비 task 매핑:

| 스펙 섹션 | 커버하는 task |
|-----------|--------------|
| §1.1 그리드 단계 토큰 | Task 1.1 (globals.css), 2.2 (lib/heatmap.ts) |
| §1.2 브랜드/액센트 | Task 1.1 |
| §1.3 위험/if needed | 변경 없음 (기존 유지) |
| §1.4 Tailwind teal scale 재정의 | Task 1.1 Step 4 |
| §2 그리드 단계 알고리즘 | Task 2.1, 2.2, 2.3, 2.4 |
| §3 단계 범례 | Task 2.5, 2.6, 2.7 |
| §4 편집 미선택 셀 | Task 3.1~3.5 |
| §5 응답자 클릭/호버 | Task 4.1~4.6 |
| §6 best 우선순위 | Task 4.7 |
| §7 영향 범위 | Task 1.3 (28 파일 일괄) |
| §8 마이그레이션 순서 | Phase 1~4 = PR1~4 |

플레이스홀더 스캔: e2e seed 이벤트 ID는 placeholder 표시(`<test-event-id>`). 실제 ID 는 task 4.8 실행 시 fixtures 확인 후 결정. 그 외 placeholder 없음.

타입 일관성: `getStep`, `getStepColor`, `getStepLabels`, `getCellColor`, `resolveCellColor`, `getCellColorClass`, `getCellCssColor`, `toggleParticipant` 시그니처 task 간 일치 확인.
