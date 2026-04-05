# Event Page UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 user-reported UX bugs + apply design guide improvements to the event page, landing page, and shared components.

**Architecture:** All changes target the existing component tree. EventPageClient.tsx is the main orchestrator. Most fixes are localized to individual components. No new routes or API changes needed.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Framer Motion, Supabase

**Design Reference:** `whenmeets-design-preview.html` (첨부된 디자인 가이드 HTML)

**DESIGN.md:** `DESIGN.md` (프로젝트 루트)

**User Requirements:** `memory/project_v2_requirements.md` (21개 UX 요구사항)

---

## File Map

| File | Role | Tasks |
|------|------|-------|
| `src/components/drag-grid/GridCell.tsx` | 개별 셀 렌더링 | 1 |
| `src/components/drag-grid/useGridDrag.ts` | 드래그 로직 | 1 |
| `src/hooks/useAvailabilitySave.ts` | 자동 저장 훅 | 2 |
| `src/components/event-page/EventPageClient.tsx` | 메인 이벤트 페이지 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| `src/components/availability-grid/AvailabilityGrid.tsx` | 공유 그리드 레이아웃 | 3 |
| `src/components/results/HeatmapGrid.tsx` | 히트맵 렌더링 | 6 |
| `src/components/event-page/TimezoneSelector.tsx` | 타임존 선택 | 5 |
| `src/components/event-page/NameForm.tsx` | 이름 입력 (참고만) | 11 |
| `src/app/page.tsx` | 랜딩 페이지 | 12 |
| `src/components/layout/Header.tsx` | 헤더 | 12 |
| `src/components/auth/AuthButton.tsx` | 인증 버튼 | 12 |
| `src/components/ui/ConfirmModal.tsx` | **신규** — 커스텀 확인 모달 | 10 |

---

## Task 1: 안되는 시간 모드 드래그 버그 수정 + 빨간색 적용

**문제:** unavailable 모드로 편집 시 드래그해도 선택이 안 보임. 빨간색 시각적 피드백 필요.

**Files:**
- Modify: `src/components/drag-grid/GridCell.tsx:16-21`
- Modify: `src/components/drag-grid/useGridDrag.ts:33-55`

**원인 분석:** `useGridDrag.ts:87-95`에서 `activeMode !== 0`일 때만 erasing 로직 실행. unavailable 모드(`activeMode=0`)에서는 `erasing`이 항상 `false`인데, `applyToCell`(line 33-55)에서 `erasing || activeMode === 0`이면 셀을 **삭제**함. 즉 unavailable을 칠하려 해도 지우기만 됨.

- [ ] **Step 1: `useGridDrag.ts` — unavailable 모드 드래그 로직 수정**

`src/components/drag-grid/useGridDrag.ts`의 `applyToCell` 함수에서 `activeMode === 0`을 삭제 조건이 아닌 "0을 칠하는" 조건으로 변경:

```typescript
// 기존 (line 33-55 부근):
// if (erasing || activeMode === 0) → 셀 삭제
// 이걸 아래로 변경:

function applyToCell(date: string, slot: string) {
  // ... (중복 체크 등 기존 로직 유지)
  
  if (erasing) {
    // erasing 모드: 셀 삭제
    const copy = { ...draftRef.current };
    if (copy[date]) {
      const { [slot]: _, ...rest } = copy[date];
      copy[date] = rest;
      if (Object.keys(rest).length === 0) delete copy[date];
    }
    draftRef.current = copy;
  } else {
    // 칠하기 모드: activeMode 값으로 설정 (0, 1, 2 모두 동일 로직)
    draftRef.current = {
      ...draftRef.current,
      [date]: { ...draftRef.current[date], [slot]: activeMode },
    };
  }
  onAvailabilityChange(draftRef.current);
}
```

또한 `handlePointerStart`(line 74-100)의 erasing 판단도 수정:

```typescript
// 기존: if (activeMode !== 0) { ... erasing 체크 }
// 변경: 모든 activeMode에 대해 erasing 체크
erasing.current = false;
const cell = getCellFromPoint(x, y);
if (cell) {
  const existing = availability[cell.date]?.[cell.slot];
  if (existing === activeMode) erasing.current = true;
}
```

- [ ] **Step 2: `GridCell.tsx` — unavailable 셀 색상을 빨간색으로 강화**

`src/components/drag-grid/GridCell.tsx`의 `CELL_COLORS` 수정:

```typescript
const CELL_COLORS: Record<AvailabilityLevel | -1, string> = {
  [-1]: '',
  0: 'bg-red-400/30',      // 변경: 더 진한 빨간색 (기존 bg-red-500/15)
  1: 'bg-[#FFE8B8]',
  2: 'bg-[#4F46E5]/[.47]',
};
```

- [ ] **Step 3: 동작 확인**

브라우저에서 이벤트 생성 → "안 되는 시간 수합" 모드 → 편집 모드 진입 → 드래그 시 빨간색 셀이 칠해지는지 확인. 같은 셀 다시 드래그하면 지워지는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/components/drag-grid/useGridDrag.ts src/components/drag-grid/GridCell.tsx
git commit -m "fix: unavailable 모드 드래그 버그 수정 + 빨간색 강화"
```

---

## Task 2: 중간 저장 기능 제거

**문제:** 편집 중 500ms 디바운스로 자동 저장됨. 백엔드 통신마다 로딩. "편집 완료" 클릭 시에만 저장하도록 변경.

**Files:**
- Modify: `src/hooks/useAvailabilitySave.ts` (전체 리팩토링)
- Modify: `src/components/event-page/EventPageClient.tsx:105, 292-295, 339-353`

- [ ] **Step 1: `useAvailabilitySave.ts` — 디바운스 제거, 명시적 save로 변경**

전체 파일을 아래로 교체:

```typescript
'use client';

import { useCallback, useState } from 'react';
import type { Availability } from '@/lib/types';

interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantToken: string | null;
}

export function useAvailabilitySave({ eventId, participantId, participantToken }: UseAvailabilitySaveOptions) {
  const [saving, setSaving] = useState(false);

  const saveNow = useCallback(async (availability: Availability) => {
    if (!participantId || !participantToken) return;
    setSaving(true);
    try {
      await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': participantToken,
        },
        body: JSON.stringify({ availability }),
      });
    } finally {
      setSaving(false);
    }
  }, [eventId, participantId, participantToken]);

  return { saving, saveNow };
}
```

- [ ] **Step 2: `EventPageClient.tsx` — saveAvailability → saveNow 호출을 "편집 완료" 시로 이동**

기존 `handleAvailabilityChange` (line 292-295)에서 `saveAvailability` 호출 제거:

```typescript
// 기존:
function handleAvailabilityChange(newAvailability: Availability) {
  setAvailability(newAvailability);
  saveAvailability(newAvailability);  // 삭제
}

// 변경:
function handleAvailabilityChange(newAvailability: Availability) {
  setAvailability(newAvailability);
}
```

"편집 완료" 버튼 핸들러에서 저장 호출 추가:

```typescript
// 기존 편집 완료 로직 (line 339-353 부근):
// onClick={() => setViewMode('view')}

// 변경:
async function handleFinishEditing() {
  await saveNow(availability);
  setViewMode('view');
}
// 버튼의 onClick을 handleFinishEditing으로 변경
```

hook 초기화 변경:

```typescript
// 기존 (line 105):
const { saving, saveAvailability } = useAvailabilitySave({ ... });

// 변경:
const { saving, saveNow } = useAvailabilitySave({ ... });
```

"편집 완료" 버튼에 saving 상태 반영:

```typescript
<button
  onClick={handleFinishEditing}
  disabled={saving}
  className="..."
>
  {saving ? '저장 중...' : '편집 완료'}
</button>
```

- [ ] **Step 3: beforeunload/sendBeacon 관련 코드 제거 확인**

`useAvailabilitySave.ts`에서 `beforeunload`, `sendBeacon`, `flushPending` 모두 제거됨을 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/useAvailabilitySave.ts src/components/event-page/EventPageClient.tsx
git commit -m "feat: 중간 저장 제거 — 편집 완료 시에만 저장"
```

---

## Task 3: 히트맵 7일 페이징 <> 버튼 복구

**문제:** QA에서 가로 스크롤을 추가했는데, 유저가 원하는 건 7일 페이징 + <> 버튼. 가로 스크롤 제거.

**Files:**
- Modify: `src/components/availability-grid/AvailabilityGrid.tsx:60-61`

- [ ] **Step 1: overflow-x-auto 제거, 원래 justify-center 복구**

```typescript
// 기존 (QA에서 수정한 것):
<div className="overflow-x-auto -mx-4 px-4">
  <div className="flex items-start mx-auto" style={{ width: ..., minWidth: 'min-content' }}>

// 복구:
<div className="flex justify-center">
  <div className="flex items-start" style={{ width: GRID_WIDTH + TIME_COL_WIDTH + (needsPagination ? 80 : 0) }}>
```

**Note:** `maxColumns` 기본값이 이미 7이고, pagination 로직도 이미 있음 (line 42-55). 날짜가 7개 이하면 페이징 불필요, 8개 이상이면 자동 페이징. 모바일에서는 `maxColumns`를 줄이는 별도 로직 필요할 수 있으나, 현재 요구사항에는 없으므로 데스크톱 7일 페이징만 복구.

- [ ] **Step 2: 모바일에서 그리드 너비 축소 (반응형)**

모바일에서 770px 고정폭이 넘치는 문제는 그리드 자체를 축소하는 방식으로 해결:

```typescript
// AvailabilityGrid.tsx 상단에 추가:
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 640);
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
}, []);

// GRID_WIDTH를 동적으로:
const gridWidth = isMobile ? Math.min(GRID_WIDTH, window.innerWidth - TIME_COL_WIDTH - 32) : GRID_WIDTH;
```

이를 통해 모바일에서도 가로 스크롤 없이 날짜 칼럼이 좁아지되 전부 보이게 함.

- [ ] **Step 3: 커밋**

```bash
git add src/components/availability-grid/AvailabilityGrid.tsx
git commit -m "fix: 히트맵 7일 페이징 복구 + 모바일 그리드 축소"
```

---

## Task 4: Available/Unavailable/If Needed 슬라이드 토글 사이드바 상단

**문제:** 편집 모드에서 Available/If Needed 모드 선택이 그리드 위에 버튼으로 있음. 사이드바 최상단에 슬라이드 토글로 옮기고, 선택된 모드에 맞는 하이라이트 색상 적용.

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx` (사이드바 영역)
- Modify: `src/components/drag-grid/DragGrid.tsx` (ModeSwitch 제거, activeMode props 추가)
- Modify: `src/components/ui/SegmentedControl.tsx` (기존 컴포넌트 재사용)

- [ ] **Step 1: DragGrid에서 activeMode를 내부 state가 아닌 props로 받기**

`src/components/drag-grid/DragGrid.tsx`:

```typescript
// 기존 (line 35):
const [activeMode, setActiveMode] = useState<AvailabilityLevel>(...);

// 변경: props로 받기
interface DragGridProps {
  // ... 기존 props
  activeMode: AvailabilityLevel;
  onActiveModeChange: (mode: AvailabilityLevel) => void;
}

// ModeSwitch 렌더링 제거 (EventPageClient 사이드바로 이동)
```

- [ ] **Step 2: EventPageClient — activeMode state 추가 + 사이드바에 SegmentedControl 배치**

```typescript
// EventPageClient.tsx 상단 state:
const [activeMode, setActiveMode] = useState<AvailabilityLevel>(
  event.mode === 'unavailable' ? 0 : 2
);

// DragGrid에 전달:
<DragGrid
  activeMode={activeMode}
  onActiveModeChange={setActiveMode}
  // ... 기존 props
/>
```

사이드바 편집 모드 영역 (line 414-459)을 아래로 변경:

```tsx
{/* 사이드바 — 편집 모드 */}
{viewMode === 'edit' && (
  <div className="...">
    {/* 모드 선택 슬라이드 토글 (최상단) */}
    <div className="mb-4">
      <SegmentedControl
        options={
          event.mode === 'unavailable'
            ? [{ value: 0, label: 'Unavailable', variant: 'danger' }]
            : [
                { value: 2, label: 'Available' },
                { value: 1, label: 'If Needed' },
              ]
        }
        value={activeMode}
        onChange={(v) => setActiveMode(v as AvailabilityLevel)}
      />
    </div>

    {/* 선택된 모드 하이라이트 표시 */}
    <div className={`p-3 rounded-lg mb-4 text-sm ${
      activeMode === 2 ? 'bg-indigo-50 text-indigo-700' :
      activeMode === 1 ? 'bg-amber-50 text-amber-700' :
      'bg-red-50 text-red-700'
    }`}>
      {activeMode === 2 && '✓ 되는 시간을 드래그하세요'}
      {activeMode === 1 && '✓ 필요하다면 가능한 시간을 드래그하세요'}
      {activeMode === 0 && '✓ 안 되는 시간을 드래그하세요'}
    </div>

    {/* 범례 */}
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">범례</h3>
      <div className="flex flex-col gap-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#4F46E5]/[.47]" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-[#FFE8B8]" />
          <span>필요하다면..</span>
        </div>
      </div>
    </div>

    {/* 타임존 셀렉터 */}
    <TimezoneSelector />

    {/* 내 응답 삭제 */}
    <button onClick={handleDeleteAvailability} className="text-sm text-red-500 hover:text-red-700 mt-4">
      내 응답 삭제
    </button>
  </div>
)}
```

- [ ] **Step 3: SegmentedControl에 variant 지원 추가**

`src/components/ui/SegmentedControl.tsx`에 이미 `variant: 'danger'` 지원이 있는지 확인하고, 없으면 추가.

- [ ] **Step 4: 커밋**

```bash
git add src/components/drag-grid/DragGrid.tsx src/components/event-page/EventPageClient.tsx src/components/ui/SegmentedControl.tsx
git commit -m "feat: Available/If Needed 슬라이드 토글 사이드바 상단 이동"
```

---

## Task 5: 타임존 셀렉트 디자인 개선

**문제:** 기본 `<select>` 태그 사용 → 못생김. 커스텀 드롭다운으로 변경.

**Files:**
- Modify: `src/components/event-page/TimezoneSelector.tsx`

- [ ] **Step 1: native select를 커스텀 드롭다운으로 변경**

```tsx
export default function TimezoneSelector({ onChange }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState<string>('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 기존 useEffect (localStorage/detect) 유지

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer w-full"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" ...>{/* 지구 아이콘 */}</svg>
        <span className="flex-1 text-left truncate">{formatTimezoneDisplay(timezone)}</span>
        <svg className="w-3 h-3 text-gray-400" ...>{/* 화살표 */}</svg>
      </button>

      {/* 드롭다운 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {allTimezones.map((tz) => (
              <button
                key={tz.value}
                onClick={() => { handleChange(tz.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  timezone === tz.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{formatTimezoneDisplay(tz.value)}</span>
                {timezone === tz.value && <span className="text-indigo-600">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/event-page/TimezoneSelector.tsx
git commit -m "style: 타임존 셀렉터 커스텀 드롭다운으로 개선"
```

---

## Task 6: 히트맵/그리드 뷰 개선 + 숫자 항상 표시 + hover scale

**문제:** 히트맵이 딱딱하고, 숫자가 편집 모드에서만 보임. 뷰 모드에서도 응답 수 보여야 함. hover 시 scale 애니메이션.

**Files:**
- Modify: `src/components/results/HeatmapGrid.tsx:84-100`

- [ ] **Step 1: HeatmapGrid 셀에 응답 수 표시 + hover scale**

`renderCell` 내부 JSX 수정:

```tsx
// HeatmapGrid.tsx의 renderCell (AvailabilityGrid에 전달되는 함수):
function renderCell(date: string, slot: number) {
  const count = getCount(date, slot);
  const bgColor = hasBestSlots
    ? (isBest ? '#4F46E5FF' : undefined)
    : computeCellColor(count, total);

  return (
    <div
      className="relative w-full h-full transition-transform duration-150 hover:scale-[1.08] hover:z-10 cursor-pointer"
      style={{ backgroundColor: bgColor }}
      onMouseEnter={() => onCellHover?.(date, slot)}
      onMouseLeave={() => onCellHover?.(null)}
    >
      {/* 응답 수 항상 표시 (1명 이상일 때) */}
      {count > 0 && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums text-white/80 pointer-events-none">
          {count}
        </span>
      )}
      {/* 호버된 참가자 표시 */}
      {isHoveredAvailable && (
        <div className="absolute inset-0" style={{ outline: '1.5px dashed #111827', outlineOffset: '-1px' }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/results/HeatmapGrid.tsx
git commit -m "feat: 히트맵 응답 수 항상 표시 + hover scale 애니메이션"
```

---

## Task 7: 이벤트 기록 localStorage 저장 + 카드 디자인 + 수정/삭제

**문제:** 내가 만든/참여한 이벤트 기록이 안 남음. localStorage에 저장하고 대시보드 또는 랜딩에서 보여주기.

**Files:**
- Create: `src/lib/event-history.ts` (localStorage 유틸)
- Modify: `src/components/event-form/EventFormModal.tsx` (이벤트 생성 시 기록 저장)
- Modify: `src/components/event-page/EventPageClient.tsx` (참여 시 기록 저장)
- Modify: `src/app/page.tsx` (랜딩에 최근 이벤트 목록 표시)

- [ ] **Step 1: event-history.ts 유틸 생성**

```typescript
// src/lib/event-history.ts
const STORAGE_KEY = 'whenmeets:event-history';

export interface EventHistoryItem {
  id: string;
  title: string;
  dates: string[];
  role: 'creator' | 'participant';
  participantCount?: number;
  lastVisited: string; // ISO date
}

export function getEventHistory(): EventHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEventToHistory(item: EventHistoryItem) {
  const history = getEventHistory().filter((h) => h.id !== item.id);
  history.unshift(item);
  // 최대 20개 보관
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function removeEventFromHistory(id: string) {
  const history = getEventHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function updateEventInHistory(id: string, updates: Partial<EventHistoryItem>) {
  const history = getEventHistory().map((h) =>
    h.id === id ? { ...h, ...updates, lastVisited: new Date().toISOString() } : h
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
```

- [ ] **Step 2: 이벤트 생성 시 기록 저장**

`EventFormModal.tsx`의 `handleSubmit`에서 `router.push` 전에:

```typescript
import { addEventToHistory } from '@/lib/event-history';

// handleSubmit 내부, router.push 전:
addEventToHistory({
  id,
  title: title.trim(),
  dates,
  role: 'creator',
  participantCount: 0,
  lastVisited: new Date().toISOString(),
});
```

- [ ] **Step 3: 이벤트 참여 시 기록 저장**

`EventPageClient.tsx`의 `handleNameSubmit`에서 참여 성공 후:

```typescript
import { addEventToHistory } from '@/lib/event-history';

// handleNameSubmit 내부, 참여 성공 후:
addEventToHistory({
  id: eventId,
  title: event.title,
  dates: event.dates,
  role: 'participant',
  participantCount: event.participants.length,
  lastVisited: new Date().toISOString(),
});
```

- [ ] **Step 4: 랜딩 페이지에 최근 이벤트 카드 목록 표시**

`src/app/page.tsx`에 최근 이벤트 섹션 추가. 디자인 가이드의 event-item 스타일 사용:

```tsx
// 랜딩 페이지 하단 (CTA 아래):
const [history, setHistory] = useState<EventHistoryItem[]>([]);
useEffect(() => { setHistory(getEventHistory()); }, []);

{history.length > 0 && (
  <div className="mt-12 w-full max-w-lg">
    <h2 className="text-sm font-semibold text-gray-500 mb-3">최근 이벤트</h2>
    <div className="flex flex-col gap-3">
      {history.slice(0, 5).map((item) => (
        <a
          key={item.id}
          href={`/e/${item.id}`}
          className="flex items-center justify-between min-h-16 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div>
            <div className="text-sm font-semibold text-gray-900">{item.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {item.role === 'creator' ? '내가 만듦' : '참여함'} · {item.dates.length}일
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
              {item.role === 'creator' ? '관리' : '참여'}
            </span>
            {/* 삭제 버튼 (기록에서만 삭제) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                removeEventFromHistory(item.id);
                setHistory((h) => h.filter((x) => x.id !== item.id));
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </a>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/event-history.ts src/components/event-form/EventFormModal.tsx src/components/event-page/EventPageClient.tsx src/app/page.tsx
git commit -m "feat: 이벤트 기록 localStorage 저장 + 랜딩 최근 이벤트 카드"
```

---

## Task 8: 이벤트 수정 버튼 → 모달창

**문제:** "이벤트 수정" 클릭 시 아무 동작 없음. 이벤트 생성 모달과 동일한 모달이 떠야 함 (제목, 날짜, 시간범위 수정 가능).

**Files:**
- Modify: `src/components/event-form/EventFormModal.tsx` (편집 모드 지원)
- Modify: `src/components/event-page/EventPageClient.tsx` (수정 모달 트리거)
- Modify: `src/app/api/events/[id]/route.ts` (PATCH 엔드포인트 추가)

- [ ] **Step 1: EventFormModal에 편집 모드 props 추가**

```typescript
interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  editEvent?: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
    mode: EventMode;
    date_only: boolean;
  };
  onEventUpdated?: () => void;
}
```

`editEvent`이 전달되면:
- 초기값을 editEvent에서 로드
- 제목: `editEvent.title`
- 날짜: `editEvent.dates`
- 시간: `editEvent.time_start`, `editEvent.time_end`
- 모드: `editEvent.mode`
- 제출 시 POST 대신 PATCH `/api/events/${editEvent.id}` 호출
- 모달 제목: "이벤트 수정"
- 버튼 텍스트: "수정 완료"

- [ ] **Step 2: API PATCH 엔드포인트 추가**

`src/app/api/events/[id]/route.ts`에 PATCH 핸들러:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServerClient();

  const { error } = await supabase
    .from('events')
    .update({
      title: body.title,
      dates: body.dates,
      time_start: body.time_start,
      time_end: body.time_end,
      mode: body.mode,
      date_only: body.date_only,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: EventPageClient에서 수정 모달 트리거**

```typescript
const [showEditModal, setShowEditModal] = useState(false);

// "이벤트 수정" 텍스트 클릭 시:
<span
  onClick={() => setShowEditModal(true)}
  className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer"
>
  이벤트 수정
</span>

// 모달 렌더링:
{showEditModal && (
  <EventFormModal
    open={showEditModal}
    onClose={() => setShowEditModal(false)}
    editEvent={{
      id: eventId,
      title: event.title,
      dates: event.dates,
      time_start: event.time_start,
      time_end: event.time_end,
      mode: event.mode,
      date_only: event.date_only,
    }}
    onEventUpdated={() => {
      setShowEditModal(false);
      // 이벤트 데이터 다시 fetch
      fetch(`/api/events/${eventId}`).then(r => r.json()).then(setEvent);
    }}
  />
)}
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/event-form/EventFormModal.tsx src/components/event-page/EventPageClient.tsx src/app/api/events/[id]/route.ts
git commit -m "feat: 이벤트 수정 모달 + PATCH API"
```

---

## Task 9: 설명 추가 기능

**문제:** "+ 설명 추가" 버튼이 있는데 클릭해도 아무 동작 안 함.

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx`
- Modify: `src/app/api/events/[id]/route.ts` (description 필드 추가)

- [ ] **Step 1: 설명 입력 인라인 에디터**

```typescript
// EventPageClient.tsx state 추가:
const [description, setDescription] = useState(event.description ?? '');
const [editingDescription, setEditingDescription] = useState(false);

// "+ 설명 추가" 부분 (line 358 부근):
{editingDescription ? (
  <div className="mt-2">
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="이벤트 설명을 입력하세요"
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring focus:ring-indigo-600/10 resize-none"
      rows={3}
      autoFocus
    />
    <div className="flex gap-2 mt-2">
      <button onClick={saveDescription} className="text-sm text-indigo-600 font-medium">저장</button>
      <button onClick={() => { setEditingDescription(false); setDescription(event.description ?? ''); }} className="text-sm text-gray-400">취소</button>
    </div>
  </div>
) : description ? (
  <p className="mt-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => setEditingDescription(true)}>
    {description}
  </p>
) : (
  <p className="mt-2 text-sm text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => setEditingDescription(true)}>
    + 설명 추가
  </p>
)}
```

`saveDescription` 함수:

```typescript
async function saveDescription() {
  await fetch(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  setEvent({ ...event, description });
  setEditingDescription(false);
}
```

- [ ] **Step 2: EventData 타입에 description 추가**

`src/lib/types.ts`의 Event interface에:

```typescript
export interface Event {
  // ... 기존 필드
  description?: string;
}
```

- [ ] **Step 3: API와 서버 컴포넌트에서 description 필드 포함**

`src/app/e/[id]/page.tsx`의 select에 description 추가:

```typescript
.select('id, title, dates, time_start, time_end, created_at, password_hash, mode, date_only, description')
```

`src/app/api/events/[id]/route.ts` GET에서도 description 포함.

DB에 description 컬럼이 없으면 마이그레이션 추가:

```sql
-- supabase/migrations/006_add_description.sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/types.ts src/components/event-page/EventPageClient.tsx src/app/api/events/[id]/route.ts src/app/e/[id]/page.tsx supabase/migrations/006_add_description.sql
git commit -m "feat: 이벤트 설명 추가/수정 기능"
```

---

## Task 10: alert() 제거 → 커스텀 확인 모달

**문제:** 응답 삭제 시 브라우저 기본 `alert()` 사용. 커스텀 확인 모달로 교체.

**Files:**
- Create: `src/components/ui/ConfirmModal.tsx`
- Modify: `src/components/event-page/EventPageClient.tsx`

- [ ] **Step 1: ConfirmModal 컴포넌트 생성**

```tsx
// src/components/ui/ConfirmModal.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  onConfirm, onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: EventPageClient에서 alert → ConfirmModal 교체**

```typescript
// state 추가:
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

// 기존 alert 호출 부분을 찾아서 교체:
// 기존: if (confirm('응답을 삭제하시겠습니까?')) { ... }
// 변경:
<button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-500 ...">
  내 응답 삭제
</button>

<ConfirmModal
  open={showDeleteConfirm}
  title="응답 삭제"
  message="내 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
  confirmLabel="삭제"
  variant="danger"
  onConfirm={() => {
    // 기존 삭제 로직 실행
    handleDeleteAvailability();
    setShowDeleteConfirm(false);
  }}
  onCancel={() => setShowDeleteConfirm(false)}
/>
```

- [ ] **Step 3: 프로젝트 전체에서 다른 alert/confirm 사용 검색**

```bash
grep -rn "alert\(\\|confirm\(\\|window\.alert\\|window\.confirm" src/ --include="*.tsx" --include="*.ts"
```

발견되는 모든 곳을 ConfirmModal로 교체.

- [ ] **Step 4: 커밋**

```bash
git add src/components/ui/ConfirmModal.tsx src/components/event-page/EventPageClient.tsx
git commit -m "feat: alert() 제거 → 커스텀 확인 모달"
```

---

## Task 11: 이름 입력 모달 dialog 디자인 적용

**문제:** 현재 이름 입력 모달이 단순함. 디자인 가이드의 dialog 스타일 적용 (Google 로그인 옵션 포함).

**Files:**
- Modify: `src/components/event-page/EventPageClient.tsx` (이름 모달 JSX)

- [ ] **Step 1: 이름 모달 JSX를 디자인 가이드 dialog 스타일로 교체**

기존 모달 (EventPageClient.tsx line 530-556)을 아래로 교체:

```tsx
<AnimatePresence>
  {showNameModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setShowNameModal(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-lg font-bold text-gray-900">일정에 참여하기</h2>
          <button
            onClick={() => setShowNameModal(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">이름을 입력하거나 Google 계정으로 로그인하세요.</p>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="이름 입력"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-600 focus:ring focus:ring-indigo-600/10"
              autoFocus
              maxLength={50}
            />
            {nameError && <p className="text-sm text-red-500 mt-2">{nameError}</p>}

            <div className="text-center text-gray-400 text-sm my-4">또는</div>

            {/* Google 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleJoin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-sm font-medium text-gray-700"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button
            type="button"
            onClick={() => setShowNameModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleNameSubmit}
            disabled={nameLoading || !nameInput.trim()}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-[0px_2px_8px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {nameLoading ? '참여 중...' : '참여하기'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 2: handleGoogleJoin 함수 추가**

```typescript
async function handleGoogleJoin() {
  const supabase = createAuthBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' },
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/event-page/EventPageClient.tsx
git commit -m "style: 이름 입력 모달 dialog 디자인 적용 + Google 로그인 옵션"
```

---

## Task 12: 랜딩 배경 + 로고 + 로그인 버튼 디자인 개선

**문제:** 디자인 가이드 HTML의 mesh gradient, 로고(아이콘+텍스트), 로그인 버튼이 현재보다 나음.

**Files:**
- Modify: `src/app/page.tsx` (mesh gradient 개선)
- Modify: `src/components/layout/Header.tsx` (로고 아이콘 추가)
- Modify: `src/components/auth/AuthButton.tsx` (로그인 버튼 스타일)

- [ ] **Step 1: 랜딩 mesh gradient를 디자인 가이드 스타일로 교체**

`src/app/page.tsx`의 mesh gradient 배경을 디자인 가이드에서 참고한 스타일로 변경:

```tsx
{/* Mesh gradient background */}
<div className="absolute inset-0 -z-10"
  style={{
    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 40%, #DDD6FE 70%, #EDE9FE 100%)',
  }}
>
  {/* Blob 1 */}
  <div
    className="absolute w-[700px] h-[500px] opacity-80"
    style={{
      background: 'linear-gradient(135deg, rgba(79,70,229,0.45) 0%, rgba(129,140,248,0.35) 50%, rgba(167,139,250,0.2) 100%)',
      borderRadius: '40% 60% 55% 45% / 55% 40% 60% 45%',
      filter: 'blur(50px)',
      top: '-250px',
      left: '-150px',
      animation: 'wave1 12s ease-in-out infinite',
    }}
  />
  {/* Blob 2 */}
  <div
    className="absolute w-[600px] h-[450px] opacity-80"
    style={{
      background: 'linear-gradient(225deg, rgba(167,139,250,0.5) 0%, rgba(196,181,253,0.35) 50%, rgba(79,70,229,0.15) 100%)',
      borderRadius: '50% 50% 45% 55% / 55% 45% 50% 50%',
      filter: 'blur(50px)',
      bottom: '-200px',
      right: '-100px',
      animation: 'wave2 15s ease-in-out infinite',
    }}
  />
  {/* Blob 3 */}
  <div
    className="absolute w-[500px] h-[400px]"
    style={{
      background: 'linear-gradient(180deg, rgba(99,102,241,0.4) 0%, rgba(129,140,248,0.3) 50%, rgba(196,181,253,0.15) 100%)',
      borderRadius: '45% 55% 50% 50% / 50% 45% 55% 50%',
      filter: 'blur(40px)',
      top: '40%',
      left: '45%',
      transform: 'translate(-50%, -50%)',
      animation: 'wave3 18s ease-in-out infinite',
    }}
  />
</div>
```

기존 animation keyframes를 디자인 가이드의 `wave1`, `wave2`, `wave3`으로 교체.

- [ ] **Step 2: 로고에 아이콘 추가**

`src/components/layout/Header.tsx`의 로고 Link:

```tsx
<Link
  href="/"
  className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer py-2"
>
  <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white text-sm font-extrabold">
    W
  </div>
  WhenMeets
</Link>
```

- [ ] **Step 3: AuthButton 로그인 스타일을 디자인 가이드에 맞게 조정**

`src/components/auth/AuthButton.tsx`의 로그인 버튼을 header-cta 스타일로:

```tsx
<button
  onClick={handleSignIn}
  className="h-[38px] px-5 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] hover:-translate-y-px active:translate-y-0 transition-all cursor-pointer whitespace-nowrap"
>
  로그인
</button>
```

"Google로 로그인" → "로그인"으로 짧게. Google은 모달에서 처리.

- [ ] **Step 4: 커밋**

```bash
git add src/app/page.tsx src/components/layout/Header.tsx src/components/auth/AuthButton.tsx
git commit -m "style: 랜딩 mesh gradient + 로고 아이콘 + 로그인 버튼 디자인 개선"
```

---

## Execution Order Summary

| Task | 이슈 | 유형 | 의존성 |
|------|------|------|--------|
| 1 | 안되는 시간 드래그 버그 | 버그 | 없음 |
| 2 | 중간 저장 제거 | 기능 변경 | 없음 |
| 3 | 7일 페이징 복구 | 기능 복구 | 없음 |
| 4 | 슬라이드 토글 사이드바 | 기능 + 디자인 | Task 1 (activeMode props) |
| 5 | 타임존 디자인 | 디자인 | 없음 |
| 6 | 히트맵 개선 | 디자인 | 없음 |
| 7 | 이벤트 기록 | 기능 | 없음 |
| 8 | 이벤트 수정 모달 | 기능 | 없음 |
| 9 | 설명 추가 | 기능 | Task 8 (PATCH API) |
| 10 | alert 제거 | 디자인 | 없음 |
| 11 | 이름 모달 디자인 | 디자인 | 없음 |
| 12 | 랜딩 디자인 | 디자인 | 없음 |

Task 1→4 순서 의존. Task 8→9 순서 의존 (PATCH API 공유). 나머지는 독립적.
