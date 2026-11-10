---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "*.md"
---
# DayMeet Project Conventions

## Design System Authority

DESIGN.md는 현재 없음 (코드와 불일치하여 삭제됨).
디자인 판단 시 실제 코드의 기존 패턴을 따를 것. 새로운 디자인 방향이 필요하면 사용자에게 확인.

## Design Modification Principles (MANDATORY)

기존 디자인은 무조건 유지하면서 문제만 해결한다. 임의로 디자인을 바꾸거나 새로운 시각적 요소를 끼워넣는 것 금지.

1. **문제만 정확히 잡고 디자인 구조는 보존.** "라인 들쭉날쭉" 같은 시각적 결함은 진짜 root cause(보통 sub-pixel 분배)를 잡아야지 구조를 바꿔서 다른 부분을 망가뜨리지 마라. CSS Grid `1fr` / flex grow 의 sub-pixel 라운딩이 1px border 위치를 0.5px 단위로 어긋나게 만들면 → 칼럼 width를 정수 px로 강제(`Math.floor`)하는 식으로 잡는다.
2. **회색 배경 같은 단순 처리 금지.** 점프 날짜처럼 시각적 분리가 필요한 자리는 두 줄 / 물결선 / 점선 등 디자인적 의도가 보이는 처리. 단순 회색 채움 같은 손쉬운 처리는 안 됨.
3. **창의적 디자인 결정은 알아서.** 사용자는 디자인 디테일까지 일일이 지시하기를 원치 않음. 시각적 분리·강조가 필요하면 옵션 검토하고 가장 의도적이고 깔끔한 방법 선택.
4. **같은 디자인이면 같은 컴포넌트로.** 비슷한 UI를 별도로 만들지 말고 기존 컴포넌트 재사용. 디자인 일관성은 "생긴 것만 똑같이"가 아니라 "한 컴포넌트가 여러 곳에서 재사용"되어야 함. 예: 캘린더 month 그리드를 day-of-week 모드에서도 재사용.
5. **변경 후 모든 모드 회귀 검증 필수.** 이벤트 페이지: 캘린더/요일 모드 × 시간있음/없음 × 편집/결과 모드 — 8가지 조합 모두 시각 확인. 글로벌 영향 변경(루트 레이아웃·globals.css)은 그 외 페이지까지 추가 검증.
6. **한국어 표기.** 캘린더 day headers, 모든 라벨 한국어(일/월/화/수/목/금/토) — 영어 사용 금지.
7. **시간/캘린더 그리드 sub-pixel 잡는 표준 패턴 (DPR-aware).**
   CSS px 정수만 강제하는 건 부족하다. browser zoom (110%/125%) + devicePixelRatio (1.5/2)에서는 css 1px이 fractional device px가 되어 라인이 흐려지거나 두께 차이 발생. 모든 측정값을 device pixel grid에 snap해야 한다.
   ```ts
   function getDevicePixelRatio() {
     return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
   }
   function toDevicePixel(value: number, dpr: number) {
     return Math.max(1 / dpr, Math.round(value * dpr) / dpr);
   }
   ```
   - `devicePixelRatio` state로 보유 + `resize`/`window.visualViewport.resize` 리스너로 갱신 (pinch-zoom도 잡힘)
   - 모든 width/height/gap/lineWidth를 `toDevicePixel`로 snap
   - cell width = `Math.floor((available - gapTotal) * dpr / N) / dpr`로 device-aligned 정수 분배
   - **cell border 대신 `display: grid; gap: lineWidth; background: lineColor` + cell `background: white`**: gap이 곧 line. 인접 border 겹침 방지 + sub-pixel 안전 (사용자 검증된 표준 패턴)
   - CSS `dashed` border 금지 (brower-dependent dash + per-cell reset). 점선 필요 시 `repeating-linear-gradient` background-image로 명시 패턴
   - 적용: `AvailabilityGrid`, `MonthCalendarGrid` (이 둘이 모든 그리드 컴포넌트의 base)

8. **사용자 판단은 검증 대상이 아닌 사실.** "X가 이렇게 보인다", "Y는 잘 동작한다"는 진술을 받으면 root cause 분석의 starting point로 그대로 받아들여라. "혹시 zoom level 때문 아닐까", "색상으로 오해하는 거 아닐까" 같은 가설로 사용자 관찰을 의심·검증하지 마라. 사용자가 "내 눈 의심하냐"를 외치는 순간 모든 추론 즉시 멈추고 관찰을 사실로 받아들여 코드 root cause로 역추적.

9. **표면 증상별 다른 땜빵 묶지 마라.** 같은 영역에서 두세 증상이 나오면 한 root cause로 통합 가능한지 먼저 의심. "라인 두께 차이", "라인 사라짐", "라인 끊김", "줌 시 흐려짐"은 모두 sub-pixel rasterization 가족 — 색상 진하게/구조 변경/border 방향 등 표면 fix 매번 다르게 만들지 말고 한 layer 더 깊이 (css unit → device pixel mapping → DPR) 파라. 표면 fix 했는데 다른 데서 또 터지면 root cause 못 잡은 신호.

10. **참고 자료 비교 시 깊이 추론.** "A는 잘 된다"는 사용자 진술을 받으면 A가 잘 되는 메커니즘을 끝까지 파라. surface level 코드 비교 ("A도 우리랑 비슷한 cell border인데?")로 dismiss하는 순간 또 헛돈다. mounted/computed/CSS/build config/DOM tree/parent constraints 모두 의심.

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
- 브랜드 컬러: `bg-teal-600`, `text-teal-700`, `border-teal-500` 등 `teal-*` 유틸 클래스 사용 (코드 기준)
- `teal-*` 토큰은 `globals.css`의 `@theme`에서 **Material Cyan 팔레트**(`#E0F7FA`~`#006064`, primary `#00ACC1`)로 재정의됨 — 클래스명은 `teal`이지만 실제 렌더 색은 옥색(cyan)
- 브랜드 색 변경 시 `globals.css`의 `@theme` `--color-teal-*` 10단계만 고치면 모든 `teal-*` 클래스에 반영. 단 테마를 우회하는 하드코딩 hex/rgba(로고 SVG, `heatmap.ts` 스텝 색, OG 이미지, `GridCell` 셀 색)는 별도 확인
- Grays: Tailwind gray scale (`gray-50` through `gray-900`)
- Availability: `getCellColorClass`/`getCellCssColor` in `src/components/drag-grid/GridCell.tsx`
- NEVER write raw hex (`#4F46E5`) or `rgba()` inline in JSX

### Spacing
- Use Tailwind spacing scale (`p-4`, `gap-6`, `mt-8`)

### Typography
- **Pretendard ONLY** — Geist Mono is BANNED
- Tabular number display: use `tabular-nums` CSS property with Pretendard

### Shared Constants (`src/lib/constants.ts`)
Before creating any new magic number or string, check if it already exists:
- `CELL_HEIGHT` — grid cell height in pixels
- `CELL_HEIGHT_MOBILE` — 모바일·태블릿 시간 셀 높이(`CELL_HEIGHT`의 1.5배). 편집·결과 그리드 공용
- `TIME_COL_WIDTH_DESKTOP`, `TIME_COL_WIDTH_MOBILE` — 시간 범례와 스크롤 여백 폭
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
- 예외: `EventPageClient`의 이름 입력 모달은 내용에 맞는 높이와 뷰포트 기준 `max-h-*`를 사용한다. 헤더·하단 버튼은 축소하지 않고 본문만 스크롤한다.
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

## No Code Comments (MANDATORY)

`src/`, `scripts/`, `.claude/scripts/` 의 코드에 주석(`//`, `/* */`, JSX `{/* */}`, CSS `/* */`)을 새로 쓰지 않는다. 의도는 이름과 구조로 드러낸다.

- `.claude/scripts/hooks/pre-edit-block-new-comments.js` 가 Edit/Write 의 주석 본문을 편집 전후로 비교해서, 편집 전에 없던 주석이 생기면 막는다. 기존 주석을 지우거나 내용 그대로 옮기는 편집은 통과한다. 내용을 바꾸면 새 주석으로 센다.
- 지시어는 주석으로 세지 않는다: `eslint-disable`, `eslint-enable`, `eslint-env`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck`, `@ts-check`, `prettier-ignore`, `/// <reference />`, `istanbul ignore`, `c8 ignore`, `v8 ignore`. 접두사만 비슷한 설명 주석은 지시어가 아니다.
- 문자열, 템플릿 리터럴(`${}` 안은 코드로 본다), 정규식 안의 `//` 는 주석이 아니다. `.css` 는 `/* */` 만 주석으로 센다. JSX 텍스트처럼 해석이 모호한 곳은 주석으로 오인할 수 있다. 막히면 코드를 고쳐 쓰고, 정말 필요하면 Claude Code 를 띄우기 전에 `HARNESS_BYPASS_COMMENT_BLOCK=1` 을 설정한다.
- 이미 있는 주석은 이 규칙으로 정리하지 않는다. 기능 작업과 섞지 말고 별도 PR 로 지운다.

## Testing Standards

실제로 돌아가는 기준만 적는다.

- 러너는 Vitest(`environment: 'node'`). 테스트는 `src/**/__tests__/` 와 `scripts/__tests__/` 에 둔다. `.claude/**` 는 러너에서 제외한다.
- 커밋 전에 `npm run verify` 가 통과해야 한다. CI 의 `verify` 가 같은 순서로 실행한다.
- 버그 수정은 재현 테스트를 먼저 쓰고(실패 확인), 고친 뒤 통과시킨다.
- 커버리지 수치 기준(전역 룰의 80%)과 E2E(Playwright)는 이 프로젝트에 적용하지 않는다. 커버리지 도구도 E2E 도구도 설치돼 있지 않다. 도입 여부는 소유자가 정한다.
- UI 조작감(드래그 선택, 셀 토글, 모바일 시트)은 자동 테스트로 잡지 못한다. 순수 로직은 `drag-logic.test.ts` 처럼 함수로 분리해서 시험하고, 나머지는 브라우저에서 직접 확인한다.

## Commit Messages

All commit messages MUST be written in Korean.

## Branch Workflow

Never commit directly to main. Always create a feature branch first:
- `feat/<task-name>` for features
- `fix/<task-name>` for bugfixes
