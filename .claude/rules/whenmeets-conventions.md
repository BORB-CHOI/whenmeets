---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "*.md"
---
# WhenMeets Project Conventions

## Design System Authority

DESIGN.md는 현재 없음 (코드와 불일치하여 삭제됨).
디자인 판단 시 실제 코드의 기존 패턴을 따를 것. 새로운 디자인 방향이 필요하면 사용자에게 확인.

## UI Component Library — shadcn/ui 패턴 (Radix UI 기반)

모든 인터랙션 컴포넌트는 **shadcn/ui 패턴**을 따른다.
- 기반: `@radix-ui` headless 컴포넌트 + Tailwind v4 스타일링
- 공통 유틸: `cn()` — `src/lib/cn.ts` (clsx + tailwind-merge)
- 컴포넌트 위치: `src/components/ui/` (Select, ConfirmModal, SegmentedControl 등)
- data attribute 기반 스타일: `data-highlighted:`, `data-disabled:`, `data-[state=checked]:` 등
- Tailwind v4 정식 클래스명 사용: `data-disabled:` (O), `data-[disabled]:` (X)

### shadcn 컴포넌트 작성 규칙

1. **새 인터랙션 컴포넌트 추가 시** `src/components/ui/`에 shadcn 패턴으로 작성
2. **`React.forwardRef`** 패턴 사용 — ref 전달 필수
3. **`cn()` 유틸** 사용 — className 병합 시 `cn()` 필수
4. **열림/닫힘 애니메이션 필수** — 모든 popover, dropdown, modal에 CSS 또는 Framer Motion 애니메이션 적용. 애니메이션 없으면 버그 취급
5. **자체 스크롤바** — 스크롤 가능한 popover/dropdown에 `custom-scrollbar` 클래스 적용 (브라우저 기본 스크롤바 사용 금지)
6. **Portal 사용** — popover/dropdown은 Portal로 body에 렌더링하여 레이아웃 시프트 방지

### 현재 설치된 Radix 패키지
- `@radix-ui/react-select`
- 새 Radix 패키지 추가 시 이 목록 업데이트할 것

### shadcn 유틸리티 의존성
- `clsx` — conditional className
- `tailwind-merge` — Tailwind 클래스 충돌 해결

## No Hardcoding

NEVER hardcode values that are defined in `src/lib/constants.ts`.

### Colors
- Use Tailwind utility classes matching existing code patterns
- Primary: `bg-emerald-600`, `text-emerald-700`, `border-emerald-500` (코드 기준)
- Grays: Tailwind gray scale (`gray-50` through `gray-900`)
- Availability: `AVAILABILITY_COLORS` from `src/lib/constants.ts`
- NEVER write raw hex (`#4F46E5`) or `rgba()` inline in JSX

### Spacing
- Use Tailwind spacing scale (`p-4`, `gap-6`, `mt-8`)

### Typography
- **Pretendard ONLY** — Geist Mono is BANNED
- Tabular number display: use `tabular-nums` CSS property with Pretendard

### Shared Constants (`src/lib/constants.ts`)
Before creating any new magic number or string, check if it already exists:
- `CELL_HEIGHT` — grid cell height in pixels
- `SLOTS_PER_HOUR` — time slot granularity
- `slotToTime()` — slot index to "HH:MM"
- `formatDateCompact()` — date to "M/D day-of-week"
- `generateSlots()` — slot range generator
- `DAY_OF_WEEK_LABELS`, `isDayOfWeekKey()` — day-of-week mode helpers

Availability level type is `AvailabilityLevel = 0 | 1 | 2` in `src/lib/types.ts`.
Cell color logic lives in `src/components/drag-grid/GridCell.tsx` (`getCellColorClass`, `getCellCssColor`).

If a value appears in 2+ files, extract it to `constants.ts`.

## Animation (MANDATORY)

ALL show/hide transitions MUST have animation. No animation = bug.

### 방법 1: Framer Motion (React 컴포넌트 mount/unmount)
```tsx
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>
```

### 방법 2: CSS 애니메이션 (Radix/shadcn 컴포넌트)
Radix 컴포넌트는 `data-state="open"` / `data-state="closed"` 속성을 자동 제공.
`globals.css`에 keyframes 정의 후 data attribute 셀렉터로 적용:
```css
[data-radix-select-content][data-state="open"] {
  animation: select-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
```
**주의:** Radix Select는 닫힘 시 portal을 즉시 unmount하므로 CSS exit 애니메이션 불가.
exit 애니메이션이 필요하면 Framer Motion `AnimatePresence` + `forceMount` 조합 사용.

### 이징 기준
- 열림(enter): `cubic-bezier(0.16, 1, 0.3, 1)` — ease-out-expo
- 닫힘(exit): `cubic-bezier(0.16, 1, 0.3, 1)` — 빠르게
- 일반 트랜지션: `cubic-bezier(0.4, 0, 0.2, 1)`

## Layout Stability (MANDATORY)

- Modal height: ALWAYS fixed. Never use `h-auto` or `max-h-*` that causes layout shift.
- Calendar height: fixed regardless of month length.
- No layout shift on data load — use skeleton or fixed-size containers.

## Global Blast-Radius Changes (MANDATORY)

루트 레이아웃 / `<html>` / `<body>` / `<main>` / `globals.css` / 전역 wrapper provider —
이런 파일은 **모든 페이지의 레이아웃에 동시 영향**을 준다. 한 페이지 문제를 고치려고 건드렸다가
다른 페이지가 깨지는 회귀가 발생하기 쉬움. 다음 규칙 강제:

1. **최소 변경 원칙.** 목표(예: sticky footer)에 정확히 필요한 클래스만 추가. "함께 가야 할 것 같아서"
   추가하는 클래스는 금지. 의심되면 빼고 동작 확인 후 필요시에만 추가.

2. **`flex` / `grid` / `position` 추가는 high-risk.** 이런 속성을 부모에 추가하면 자식의
   `mx-auto`, `width`, `align-self`, `position` 등이 의도치 않게 깨질 수 있음.
   특히 **flex 컨테이너 안의 `mx-auto`는 stretch를 무력화하고 자식을 content-width로 줄임** —
   `max-w-*` centering이 깨지는 가장 흔한 원인. 부모를 flex로 만들 때 자식의 `mx-auto` 동작을 반드시 의심.

3. **단일 관심사 커밋.** sticky footer + analytics + SEO 같이 묶지 말고 별도 커밋. 회귀 발생 시
   `git bisect` / `git diff` 범위가 좁아져야 원인 파악이 빠름.

4. **시각 회귀 검증.** 글로벌 변경 후 머지 전 최소 다음 페이지를 모두 확인:
   - `/` (홈)
   - `/dashboard`
   - `/mypage`
   - `/e/[id]` (date 모드, day-of-week 모드 둘 다)
   - 모달 / 스켈레톤 상태
   각 페이지의 가로폭·중앙정렬·footer 위치·overflow를 시각적으로 확인.
   대상 페이지 하나만 보고 머지하지 말 것.

5. **Dev server는 사용자 터미널에서.** Bash run_in_background로 dev server를 띄우지 말 것 —
   사용자가 직접 중지할 수 없음. 띄워야 한다면 사용자에게 직접 실행 요청. 빌드 검증이 필요하면
   `next build` 같은 일회성 커맨드를 foreground로 실행.

## Commit Messages

All commit messages MUST be written in Korean.

## Branch Workflow

Never commit directly to main. Always create a feature branch first:
- `feat/<task-name>` for features
- `fix/<task-name>` for bugfixes
