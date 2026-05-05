# 2026-05-06 — Teal 브랜드 / 그리드 단계 범례 / 응답자 인터랙션 디자인

## 개요

5개 변경을 한 번에 정리한 디자인 스펙. 사용자 첨부 이미지(공부시간 통계 앱)를 디자인 레퍼런스로 사용.

1. 브랜드 컬러를 emerald 계열에서 Material teal 계열로 전환
2. 그리드 뷰 상단에 색상 단계 + 인원수 임계 범례 표시
3. 편집 모드의 미선택 셀이 모드별 반대색을 띠도록 변경
4. 응답자 목록을 클릭 기반 단독/수합 모드로 변경 (PC + 모바일)
5. 응답자 목록 호버 시 PC에서 임시 단독 미리보기

## 1. 컬러 토큰

### 1.1 그리드 단계 (Material teal 채택)

| 토큰 | hex | 용도 |
|------|-----|------|
| `--color-grid-step-0` | `#FFFFFF` | 빈 칸 (count = 0) |
| `--color-grid-step-1` | `#E0F2F1` | 1단계 (가장 옅음) |
| `--color-grid-step-2` | `#B2DFDB` | 2단계 |
| `--color-grid-step-3` | `#4DB6AC` | 3단계 |
| `--color-grid-step-4` | `#00897B` | 4단계 |
| `--color-grid-step-5` | `#00695C` | 5단계 (만점) |

### 1.2 브랜드/액센트

| 토큰 | hex (light) | hex (dark) | 용도 |
|------|-------------|------------|------|
| `--color-primary` | `#00897B` | `#4DB6AC` | 메인 CTA, 링크, 토글 활성, 응답자 dot |
| `--color-primary-hover` | `#00695C` | `#80CBC4` | 버튼 hover |
| `--shadow-primary` | `0 2px 8px rgba(0,137,123,0.5)` | `0 2px 8px rgba(77,182,172,0.3)` | CTA 그림자 |
| `--shadow-primary-hover` | `0 4px 12px rgba(0,137,123,0.4)` | `0 4px 12px rgba(77,182,172,0.25)` | CTA hover 그림자 |

### 1.3 위험 / if needed (변경 없음)

| 토큰 | hex | 용도 |
|------|-----|------|
| `--color-danger` | `#F87171` (red-400) | unavailable 마킹 |
| `--color-warning` | `#FCD34D` (amber-300) | if needed |

### 1.4 Tailwind 토큰 재정의 (Tailwind v4 `@theme`)

Tailwind 기본 `teal-*` hex (예: `teal-100` = `#ccfbf1`) 는 Material teal 과 다른 톤이라 그대로 쓰면 사진과 어긋남. `globals.css` 의 `@theme` 블록에서 teal scale 을 Material 톤으로 재정의해 `bg-teal-*` 클래스가 Material 톤을 갖도록 함.

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

이 정의 덕에 7.2 의 emerald → teal 매핑표가 단순 클래스 치환만으로 의도된 톤을 유지함. PR1에서 함께 적용.

## 2. 그리드 단계 알고리즘

응답자 N명 균등 5단계. N=12면 사진 패턴(1+, 4+, 7+, 10+, 12)과 정확히 일치.

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
```

| N | step1 | step2 | step3 | step4 | step5 |
|---|-------|-------|-------|-------|-------|
| 2 | 1 | — | — | — | 2 |
| 4 | 1 | 2 | 3 | — | 4 |
| 12 | 1–3 | 4–6 | 7–9 | 10–11 | 12 |

기존 `HeatmapGrid` 의 `BASE_COLOR + 알파 그라데이션` 로직 제거. `CalendarHeatmapGrid` 도 동일.

## 3. 단계 범례 컴포넌트

### 3.1 위치

- `EventPageClient` `view` 모드 그리드 직상단
- `ResultsPageClient` 그리드 직상단

### 3.2 모양

```
[■][■][■][■][■]
 1+ 4+ 7+ 10+ 12
```

- 색상 박스 5개 가로 배열 (12px × 12px, 2px gap, rounded-sm)
- 박스 아래 임계값 라벨 (text-[10px] tabular-nums Pretendard)
- 마지막 단계는 `+` 없이 N 그대로 (만점)
- 박스와 라벨 사이 spacing 4px

### 3.3 라벨 계산

```ts
const labels = [
  '1+',
  `${Math.ceil(total / 4) + 1}+`,
  `${Math.ceil(total / 2) + 1}+`,
  `${Math.ceil((3 * total) / 4) + 1}+`,
  `${total}`,
];
```

- N=1 같이 임계가 겹칠 때는 중복 라벨 그대로 표시 (의도적)
- total = 0 일 땐 범례 자체 미표시

### 3.4 컴포넌트

- 신규 `src/components/results/HeatmapLegend.tsx`
- props: `total: number`, `mode: 'available' | 'unavailable'`
- `unavailable` 모드는 색·라벨은 동일하지만 캡션이 "안 되는 사람 수" 의미
- `framer-motion` 으로 라벨 숫자 변경 시 0.15s 트랜지션 (박스 자체는 정적)

## 4. 편집 모드 미선택 셀 색상

### 4.1 매핑

`available` 모드 (사용자가 *되는* 시간 마킹):

| value | 색 |
|-------|-----|
| `-1` (미선택) | red-400 alpha 0.45 |
| `0` (사실상 발생 X) | red-400 alpha 0.45 |
| `1` (if needed) | amber-300 alpha 0.55 |
| `2` (available) | teal-600 (`#00897B`) alpha 0.47 |

`unavailable` 모드 (사용자가 *안 되는* 시간 마킹):

| value | 색 |
|-------|-----|
| `-1` (미선택) | teal-600 alpha 0.47 |
| `0` (명시 unavailable) | red-400 alpha 0.45 |

### 4.2 의도

- 미선택과 명시 마킹이 같은 색으로 통합. 코드 단순화.
- `unavailable` 모드에서 0 ↔ -1 의미가 정반대라 색이 자연스럽게 다름 (-1=teal, 0=red).
- `available` 모드에서 0 마킹은 UI 진입점이 없어 사실상 -1만 발생. 둘이 같은 색이라도 무관.

### 4.3 구현

`src/components/drag-grid/GridCell.tsx`:

```ts
function getCellColor(value: AvailabilityLevel | -1, eventMode: EventMode): string {
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
```

`CELL_CSS_COLORS` (드래그 중 직접 DOM 페인트용)도 동일 함수형으로 변환. `DragGrid` 가 이미 `eventMode` prop 을 받고 있으니 GridCell에 전달만 추가.

## 5. 응답자 클릭/호버 인터랙션

### 5.1 클릭 동작 (PC + 모바일 동일)

| 현재 상태 | A 클릭 | 결과 |
|----------|--------|------|
| 전체 선택 | → | `{A}` 단독 (나머지 자동 해제) |
| 부분 선택, A 미포함 | → | A 추가 (`selectedIds.add(A)`) |
| 부분 선택, A 포함 | → | A 해제 (`selectedIds.delete(A)`) |
| 모두 해제됨 | (불가) | 자동 전체 선택 복귀 |

### 5.2 If Needed 자동 처리

- `selectedIds.size === 1` → `includeIfNeeded` 자동 `true` + 토글 UI disabled
- 2명+ → 사용자 토글값 그대로 사용
- 호버 중 → 강제 `true` (UI 토글 표시는 변경 없음, 임시이므로)

### 5.3 호버 동작 (PC만)

- `ParticipantFilter` 의 `onMouseEnter/Leave` → 부모의 `hoveredParticipantId` 갱신
- `HeatmapGrid` 내부에서 `hoveredParticipantId` 가 truthy 이면 `filtered` 를 `[hoveredOne]` 단독으로 임시 교체 + `includeIfNeeded` 강제 `true`
- 호버 종료 시 원복 (selectedIds 그대로)
- `eventMode='unavailable'` 에서도 동일 매커니즘
- 모바일은 호버 미지원 (long-press 추가 안 함)

### 5.4 상태 위치

- `selectedIds: Set<string>`, `hoveredParticipantId: string | null`, `userIncludeIfNeeded: boolean` → ResultsPageClient + EventPageClient에 위치
- 파생값:
  ```ts
  const effectiveIds = hoveredParticipantId
    ? new Set([hoveredParticipantId])
    : selectedIds;
  const effectiveIncludeIfNeeded =
    hoveredParticipantId || selectedIds.size === 1
      ? true
      : userIncludeIfNeeded;
  ```

### 5.5 컴포넌트 API

- `ParticipantFilter`: 기존 `onSelectedChange(Set)` 시그니처 유지하되 내부 `toggle` 로직 새 모델로 교체. props 호환성 유지.
- `HeatmapGrid`: props 시그니처 동일. `hoveredParticipantId` 의미만 "outline 강조" → "단독 미리보기"로 변경. 기존 `cellStats.hovered` outline 로직 제거.
- `CalendarHeatmapGrid`: 동일 변경 적용.

## 6. bestSlots 우선순위

- best 토글 ON 시: best 슬롯만 색칠, 그 외 영역 흰색 (count, hoveredParticipantId, selectedIds 무관)
- 1명 단독 / 다중 수합 / 호버 미리보기 어느 상태든 동일
- best 슬롯 자체 색: `--color-grid-step-5` (`#00695C`) — 만점 표현과 통일

`HeatmapGrid` 의 `if (hasBestSlots)` 분기를 호버 cellStats 분리 후에도 유지.

## 7. 영향 범위

### 7.1 32개 파일 분류

CSS 변수 1개 (수정만 하면 광범위 자동 반영):
- `src/app/globals.css`

코어 색상 정의:
- `src/lib/constants.ts` — `AVAILABILITY_COLORS`
- `src/components/drag-grid/GridCell.tsx` — `CELL_COLORS`, `CELL_CSS_COLORS`
- `src/components/results/HeatmapGrid.tsx` — `BASE_COLOR` 제거, 5단계 lookup
- `src/components/results/CalendarHeatmapGrid.tsx` — 동일

신규:
- `src/components/results/HeatmapLegend.tsx`

인터랙션 변경:
- `src/components/results/ParticipantFilter.tsx`
- `src/components/results/ResultsPageClient.tsx`
- `src/components/event-page/EventPageClient.tsx`

테스트:
- `src/lib/__tests__/heatmap-helpers.test.ts` — `getColor` 5단계 알고리즘 갱신, 단독/호버 케이스 추가

emerald 직접 사용 28개 파일 (`bg-emerald-*`, `text-emerald-*`, `border-emerald-*`):
- 컴포넌트 별로 매핑표 따라 일괄 치환

### 7.2 emerald → teal 매핑표

| 기존 | 신규 | 비고 |
|------|------|------|
| `bg-emerald-50` | `bg-teal-50` | |
| `bg-emerald-100` | `bg-teal-100` | |
| `bg-emerald-200` | `bg-teal-200` | |
| `bg-emerald-400` | `bg-teal-400` | |
| `bg-emerald-500` | `bg-teal-500` | |
| `bg-emerald-600` | `bg-teal-600` | 메인 CTA — Material #00897B 와 가까움 |
| `bg-emerald-700` | `bg-teal-700` | |
| `text-emerald-*` | `text-teal-*` | 동일 패턴 |
| `border-emerald-*` | `border-teal-*` | 동일 패턴 |
| `ring-emerald-*` | `ring-teal-*` | 동일 패턴 |
| `outline-emerald-*` | `outline-teal-*` | 동일 패턴 |
| raw `#059669` | `#00897B` | `BASE_COLOR` 등 hardcoded |
| raw `#10B981` | `#26A69A` | 발견 시 |
| raw `#34D399` | `#4DB6AC` | 다크모드 등 |

치환은 ripgrep + 수동 검토. design doc의 매핑표 기준.

## 8. 마이그레이션 순서 (PR 분할)

각 PR은 독립 배포 가능하고, 시각/동작 회귀를 단계적으로 검증.

### PR1 — 컬러 토큰 인프라
- `globals.css` 4개 토큰 갱신
- 28개 파일 emerald → teal 일괄 치환
- 시각만 바뀌고 동작 동일
- 가장 큰 PR이지만 mechanical 변경

### PR2 — 그리드 5단계 + 범례
- `HeatmapGrid` / `CalendarHeatmapGrid` 알고리즘 교체
- `HeatmapLegend` 신규
- `EventPageClient` `view` 모드 + `ResultsPageClient` 에 마운트
- `heatmap-helpers.test.ts` 갱신

### PR3 — 편집 미선택 셀
- `GridCell` 의 `eventMode` 활용 색상 함수
- `DragGrid` 가 GridCell에 prop 전달
- 편집 모드 진입 시 시각 회귀 검증

### PR4 — 응답자 인터랙션
- `ParticipantFilter` 새 toggle
- `HeatmapGrid` 호버 단독 미리보기 로직 변경
- `ResultsPageClient` / `EventPageClient` 상태 재구성
- `effectiveIds` / `effectiveIncludeIfNeeded` 파생
- `If Needed` 토글 disabled 처리 (1명 모드)

## 9. 리스크와 미결정

### 9.1 리스크

- **PR1 일괄 치환**: emerald 의 어떤 톤(50/100/200/400/500/600/700)을 어떤 teal에 매핑하는지 매핑표 기준으로 통제. 누락 시 시각 깨짐.
- **PR4 새 toggle 모델**: 첫 클릭 시 다른 사람 자동 해제는 기존 사용자에게 동작 변경. 익숙해지기 전에 혼란 가능.
- **다크모드**: `--color-primary` 다크 변형이 `#4DB6AC` (Material teal-300). 충분한 대비 검증 필요.

### 9.2 디자인 doc 외 확장 가능성

- 그리드 단계를 사용자가 `4/5/6` 단계 중 선택할 수 있게 하는 옵션 — 이번 스코프 외
- 호버 미리보기를 모바일에 long-press 로 추가 — 이번 스코프 외 (사용자가 보류)
- 응답자 목록 키보드 네비게이션 — 이번 스코프 외

## 10. 테스트 전략

- 단위: `heatmap-helpers.test.ts` 5단계 알고리즘 + 호버 단독 케이스
- 시각 회귀: PR1·PR2 후 핵심 페이지 스크린샷
- 인터랙션: `ParticipantFilter` 의 toggle 룰 (전체→단독, 단독→추가, 모두 해제→복귀) 단위 테스트
- E2E: 응답자 1명 클릭 시 If Needed 자동 ON 확인, 호버 미리보기 원복 확인 (Playwright)
