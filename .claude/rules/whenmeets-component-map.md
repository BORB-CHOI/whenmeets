---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# WhenMeets Component Relationship Map

When modifying ANY component, you MUST check and update all related components listed here.
Do NOT modify one side of a relationship without checking the other.

## Core Data Flow

```
EventForm → POST /api/events → DB → GET /api/events/[id] → EventPageClient → GridEditor
                                                           → ResultsPageClient → HeatmapGrid
```

## Shared Component Groups

### Grid System (availability input ↔ results display)

These components share the same data shape (`Availability` type), slot system, and visual language.
A change to one MUST be reflected in the others.

| Component | Role | File |
|-----------|------|------|
| `DragGrid` | Drag-based availability input | `src/components/drag-grid/DragGrid.tsx` |
| `CalendarDragGrid` | Calendar mode input | `src/components/drag-grid/CalendarDragGrid.tsx` |
| `GridCell` | Individual cell rendering (input) | `src/components/drag-grid/GridCell.tsx` |
| `GridEditor` | Event page editing wrapper | `src/components/event-page/GridEditor.tsx` |
| `HeatmapGrid` | Results heatmap (weekly) | `src/components/results/HeatmapGrid.tsx` |
| `CalendarHeatmapGrid` | Results heatmap (calendar) | `src/components/results/CalendarHeatmapGrid.tsx` |
| `AvailabilityGrid` | Read-only availability display | `src/components/availability-grid/AvailabilityGrid.tsx` |

**Shared concerns:**
- Cell height/width must be consistent between input and results grids
- Color logic → `getCellColorClass`/`getCellCssColor` in `src/components/drag-grid/GridCell.tsx`
- Slot format → `slotToTime()` in `src/lib/constants.ts`
- Date format → `formatDateCompact()` in `src/lib/constants.ts`
- Time labels (left-side time display) must share the same style

### Event Page (unified view)

The event page (`/e/[id]`) hosts both the heatmap results and the editing surface in a single client component. The standalone `/e/[id]/results` route now redirects to `/e/[id]` for back-compat.

| Component | Role | File |
|-----------|------|------|
| `EventPageClient` | Event participation + results viewing | `src/components/event-page/EventPageClient.tsx` |
| `ParticipantFilter` | Participant filter (used inside EventPageClient) | `src/components/results/ParticipantFilter.tsx` |

**Shared concerns:**
- Event title/description display style
- Participant count/list display format
- Date formatting
- Responsive breakpoints

### UI Primitives (shadcn 패턴)

공유 UI 컴포넌트. 다른 feature 컴포넌트에서 import하여 사용.

| Component | Role | File |
|-----------|------|------|
| `Select` | shadcn Select (Radix 기반) | `src/components/ui/Select.tsx` |
| `ConfirmModal` | 확인 모달 | `src/components/ui/ConfirmModal.tsx` |
| `SegmentedControl` | 탭 전환 | `src/components/ui/SegmentedControl.tsx` |
| `InlineDeleteButton` | 휴지통 + 삭제/취소 confirm UX | `src/components/ui/InlineDeleteButton.tsx` |
| `HoverInfoPopover` | 호버 시 앵커 위 표시되는 popover (Portal + framer-motion) | `src/components/ui/HoverInfoPopover.tsx` |
| `cn()` | className 병합 유틸 | `src/lib/cn.ts` |

**Shared concerns:**
- 스타일 변경 시 사용하는 모든 feature 컴포넌트에 영향
- 애니메이션 keyframes → `src/app/globals.css`
- 커스텀 스크롤바 → `custom-scrollbar` 클래스 in `globals.css`

### Form System (event creation)

| Component | Role | File |
|-----------|------|------|
| `EventForm` | Full form | `src/components/event-form/EventForm.tsx` |
| `EventFormModal` | Modal wrapper | `src/components/event-form/EventFormModal.tsx` |
| `DatePicker` | Date selection | `src/components/event-form/DatePicker.tsx` |
| `DayOfWeekPicker` | Day-of-week selection | `src/components/event-form/DayOfWeekPicker.tsx` |
| `TimeRangePicker` | Time range selection (uses ui/Select) | `src/components/event-form/TimeRangePicker.tsx` |

### Auth Flow

| Component | Role | File |
|-----------|------|------|
| `AuthButton` | Login/logout | `src/components/auth/AuthButton.tsx` |
| `NameForm` | Anonymous participant name | `src/components/event-page/NameForm.tsx` |
| `PasswordForm` | Event password | `src/components/event-page/PasswordForm.tsx` |
| `auth-client.ts` | Client auth | `src/lib/supabase/auth-client.ts` |
| `auth-server.ts` | Server auth | `src/lib/supabase/auth-server.ts` |
| `middleware.ts` | Session refresh | `src/middleware.ts` |

### Layout (global)

| Component | Role | File |
|-----------|------|------|
| `Header` | Header | `src/components/layout/Header.tsx` |
| `Footer` | Footer | `src/components/layout/Footer.tsx` |
| `CreateEventButton` | Event creation button | `src/components/layout/CreateEventButton.tsx` |

### MyPage (profile)

| Component | Role | File |
|-----------|------|------|
| `MyPageClient` | 프로필(이름) 편집 클라이언트 | `src/components/mypage/MyPageClient.tsx` |
| `/mypage` route | 마이페이지 SSR + auth gate | `src/app/mypage/page.tsx` |
| `useProfile` | profiles.display_name 클라이언트 fetch hook | `src/hooks/useProfile.ts` |
| `getProfileByUserId` / `pickDisplayName` | 서버 컴포넌트용 프로필 헬퍼 | `src/lib/profile.ts` |

**Shared concerns:**
- `AuthButton` 드롭다운에서 `/mypage`로 이동 — 메뉴 항목 변경 시 두 곳 모두 확인
- 이름은 `public.profiles.display_name`에 저장 (PATCH `/api/user/profile`).
  `auth.users.user_metadata.full_name`은 OAuth 재로그인마다 IdP 원본으로 덮어써지므로 user-managed 데이터 저장 금지.
- 변경 후 `router.refresh()`로 Header/AuthButton 동기화 + `participants.name`도 같은 트랜잭션에서 sync

## Modification Rules

1. **Grid color change** → update `AVAILABILITY_COLORS` in `constants.ts` → verify all 7 grid components
2. **Cell size change** → input grids AND result heatmaps must match
3. **Date format change** → update `formatDateCompact()` only (already shared)
4. **Time display change** → update `slotToTime()` + verify time labels in all grids
5. **Participant display change** → `EventPageClient` + `ResultsPageClient` + `ParticipantFilter` simultaneously
6. **Button/input style change** → verify all form components + modals + auth forms for consistency
7. **Responsive change** → follow DESIGN.md breakpoints, verify ALL pages

## API ↔ Component Mapping

| API Route | Consuming Components |
|-----------|---------------------|
| `GET /api/events/[id]` | EventPageClient, ResultsPageClient |
| `POST /api/events/[id]/participants` | NameForm → EventPageClient |
| `PATCH /api/events/[id]/participants/[pid]` | GridEditor → useAvailabilitySave |
| `GET /api/events/[id]/results` | ResultsPageClient |
| `POST /api/events/[id]/verify` | PasswordForm → EventPageClient |
| `GET/PATCH /api/user/profile` | MyPageClient (PATCH), useProfile (GET via Supabase RLS) |

When modifying an API response shape, check ALL consuming components.

## Self-Maintenance

This file MUST be updated when:
- A new component is created → add to the correct group
- A new API route is added → add to the API mapping table
- A component is renamed or moved → update the file path
- A component is deleted → remove from the map
- A new relationship group emerges → add a new section
