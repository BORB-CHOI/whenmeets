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
| `CalendarDragGrid` | Calendar/요일 mode input (uses `MonthCalendarGrid`) | `src/components/drag-grid/CalendarDragGrid.tsx` |
| `GridCell` | Individual cell rendering (input) | `src/components/drag-grid/GridCell.tsx` |
| `GridEditor` | Event page editing wrapper | `src/components/event-page/GridEditor.tsx` |
| `HeatmapGrid` | Results heatmap (weekly) — integer cellWidth, SVG-wave date-gap separator | `src/components/results/HeatmapGrid.tsx` |
| `CalendarHeatmapGrid` | Results heatmap (calendar/요일, uses `MonthCalendarGrid`) | `src/components/results/CalendarHeatmapGrid.tsx` |
| `AvailabilityGrid` | Read-only availability display — integer cellWidth, SVG-wave date-gap separator | `src/components/availability-grid/AvailabilityGrid.tsx` |
| `MonthCalendarGrid` | Shared month / 요일 grid layout (한국어 day headers, integer cell size, sub-pixel safe) | `src/components/calendar-grid/MonthCalendarGrid.tsx` |

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
| `Logo` | DayMeet 브랜드 마크 (3×3 히트맵 그리드 SVG) — Header/Footer/favicon/apple-icon/OG 공용 | `src/components/brand/Logo.tsx` |
| `Header` | Header | `src/components/layout/Header.tsx` |
| `Footer` | Footer | `src/components/layout/Footer.tsx` |
| `CreateEventButton` | Event creation button | `src/components/layout/CreateEventButton.tsx` |

**Shared concerns:**
- `Logo`는 DOM(Header/Footer)과 Satori(`app/icon.tsx`·`app/apple-icon.tsx`·`app/opengraph-image.tsx`) 양쪽에서 쓰임 — 둘 다 호환되도록 순수 `<svg>` + `<rect>`만 사용. 브랜드 색 변경 시 `Logo.tsx`의 `#00ACC1` 1곳 수정.

### Ads (global, env-gated)

| Component | Role | File |
|-----------|------|------|
| `AdSenseScript` | AdSense loader (`<head>`, `beforeInteractive`) — `NEXT_PUBLIC_ADSENSE_CLIENT` 비어 있으면 렌더 안 함 | `src/components/ads/AdSenseScript.tsx` |
| `AdSenseMeta` | `<meta name="google-adsense-account">` 사이트 소유권 확인용 | `src/components/ads/AdSenseMeta.tsx` |
| `AdSlot` | 단일 `<ins class="adsbygoogle">` — 마운트 시 `adsbygoogle.push()` | `src/components/ads/AdSlot.tsx` |
| `FloatingAds` | 2xl 좌·우 하단 + 모바일(<lg) 하단 배너 (이벤트 페이지에서는 모바일 배너 숨김) | `src/components/ads/FloatingAds.tsx` |

### SEO / AEO (global)

| Component | Role | File |
|-----------|------|------|
| `JsonLd` | schema.org JSON-LD: WebApplication + Organization + WebSite + FAQPage | `src/components/seo/JsonLd.tsx` |
| `app/robots.ts` | `/robots.txt` 자동 생성 (Next.js 관습 파일) | `src/app/robots.ts` |
| `app/sitemap.ts` | `/sitemap.xml` 자동 생성 (Next.js 관습 파일) | `src/app/sitemap.ts` |
| `app/llms.txt/route.ts` | AI 답변 엔진(ChatGPT/Perplexity/Claude)용 `/llms.txt` | `src/app/llms.txt/route.ts` |
| `public/ads.txt` | IAB ads.txt 정적 파일 — AdSense 게시자 ID 고정. env 비의존, 항상 200 (라우트 핸들러 아님) | `public/ads.txt` |

### Analytics (global, env-gated)

| Component | Role | File |
|-----------|------|------|
| `ClarityScript` | Microsoft Clarity (heatmap + session recording) — `NEXT_PUBLIC_CLARITY_PROJECT_ID` | `src/components/analytics/ClarityScript.tsx` |
| `GoogleAnalyticsScript` | GA4 gtag.js — `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-...` 형식) | `src/components/analytics/GoogleAnalyticsScript.tsx` |

**Shared concerns:**
- 환경변수 ID(`NEXT_PUBLIC_ADSENSE_*`) 미설정 시 모든 광고 컴포넌트는 렌더 안 됨 → 키 없는 환경에서도 안전
- 모바일 하단 배너 활성 시 `body { padding-bottom }`로 콘텐츠 가림 방지 — 이벤트 페이지(`/e/[id]`)는 `MobileBottomBar`(z-40)와 충돌 회피 위해 모바일 광고 비표시
- z-index: 광고 z-30 < `MobileBottomBar` z-40 < `Header` z-50 < 모달 z-100

### Dashboard (folders + event list)

| Component | Role | File |
|-----------|------|------|
| `DashboardClient` | 탭(전체/만든) + 폴더 그룹 + 모달 오케스트레이션 | `src/components/dashboard/DashboardClient.tsx` |
| `EventCard` | 이벤트 카드 + 소유자 뱃지(내 이벤트/참여 중) + 옵션 메뉴 | `src/components/dashboard/EventCard.tsx` |
| `FolderHeader` | 폴더 접기/펴기 + 이름변경/삭제 메뉴 | `src/components/dashboard/FolderHeader.tsx` |
| `FolderNameModal` | 폴더 생성/이름변경 모달 | `src/components/dashboard/FolderNameModal.tsx` |
| `MoveToFolderModal` | 이벤트를 폴더로 이동시키는 모달 | `src/components/dashboard/MoveToFolderModal.tsx` |
| `/dashboard` route | 폴더+이벤트 SSR 로드 (folders, created, participated) | `src/app/dashboard/page.tsx` |

**Shared concerns:**
- 폴더는 `folders` 테이블(`user_id`, `name` unique per user, `position`).
- 이벤트의 폴더 배정은 **사용자별**로 관리: `user_event_folders(user_id, event_id, folder_id)` 매핑 테이블.
  같은 이벤트가 사용자마다 다른 폴더에 속할 수 있음. 한 사용자의 폴더 이동이 다른 사용자 뷰에 영향 없음.
- 폴더 그룹은 모든 탭(전체/만든/참여)에서 동일하게 적용. DnD도 모든 이벤트(소유·참여 무관) 가능 — 사용자 자기 뷰만 바뀜.
- 소유자 뱃지는 `is_owner` flag로 분기 (서버에서 `events.created_by === userId` 비교).
- 폴더 mutation 후 `router.refresh()`로 RSC 캐시 무효화 (뒤로 가기 시 stale UI 방지).
- 폴더 접힘/펼침 상태는 `localStorage`(`daymeet:dashboard:collapsedFolders`)에 영속화.
- 드래그앤드롭: **@dnd-kit** 기반 (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`).
  - **명시적 드래그 핸들 패턴**: 폴더 헤더 좌측 + 이벤트 카드 좌측에 grip 아이콘(테두리 + bg 있는 버튼). 카드/헤더 본체는 클릭 트랜지션(이벤트 페이지 이동, 폴더 접기). 드래그는 핸들에서만 시작 → 모바일 스크롤과 충돌 0.
  - 폴더 헤더 핸들 드래그 → 폴더 순서 재정렬 (외부 SortableContext + verticalListSortingStrategy)
  - 이벤트 카드 핸들 드래그 → **폴더 내 순서 변경 + cross-folder 이동** (multi-container sortable 패턴: 각 폴더가 자체 SortableContext, `handleDragOver`에서 cross-container 시 즉시 folder_id 변경, `handleDragEnd`에서 affected 폴더들의 모든 카드 position 일괄 PATCH)
  - `active.data.current.type` (`'folder'` vs `'event'`)로 drag 종류 분기
  - `collisionDetection`: 폴더 드래그 → 폴더 droppable만 / 카드 드래그 → pointerWithin → rectIntersection fallback (빈 폴더에도 drop 가능)
  - PointerSensor distance 6 + TouchSensor delay 0 + tolerance 5. 명시적 핸들 덕분에 long-press 필요 없음
  - DragOverlay로 끌고 다니는 카드/폴더 표시 (회전 + opacity)
  - **Drop placeholder**: `isDragging`인 카드는 컨텐츠 invisible + wrapper에 `ring-2 ring-dashed ring-teal-400 bg-teal-50/40` → 카드가 들어갈 자리가 dashed 영역으로 명시
- `'폴더 없음'`도 사용자가 자유롭게 위치 변경 가능 — folders 테이블에 행이 없으므로 `profiles.no_folder_position` 컬럼(NULL이면 맨 아래)에 별도 저장.
- 사용자별 이벤트 카드 순서: `user_event_order(user_id, event_id, position)` 테이블 (마이그레이션 016). 행이 없으면 created_at desc fallback. user_event_folders와 별도 — folder 정보와 무관하게 카드 순서만 보관.
- 폴더 순서 일괄 업데이트: `PATCH /api/folders/reorder` (folders.position + profiles.no_folder_position을 한 번에).
- 카드 순서/폴더 일괄 업데이트: `PATCH /api/events/reorder` (user_event_folders upsert + user_event_order upsert을 트랜잭션처럼 묶음. visibility check: 소유자 OR 참여자).
- 폴더 내 이벤트 카드 그리드: 모바일 1열, `lg` 이상 2열 (`grid grid-cols-1 lg:grid-cols-2 gap-3`).

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
| `GET/POST /api/folders` | DashboardClient (folder CRUD) |
| `PATCH/DELETE /api/folders/[id]` | DashboardClient (rename/delete folder) |
| `PATCH /api/folders/reorder` | DashboardClient (폴더 순서 일괄 변경 — folders.position 다건 + profiles.no_folder_position 한 트랜잭션) |
| `PATCH /api/events/[id]/folder` | DashboardClient (move event to folder — upserts `user_event_folders` for caller; visibility check: 소유자 OR 참여자) |
| `PATCH /api/events/reorder` | DashboardClient (카드 cross-folder 이동 + 폴더 내 순서 일괄 — user_event_folders upsert/delete + user_event_order upsert) |

When modifying an API response shape, check ALL consuming components.

## Self-Maintenance

This file MUST be updated when:
- A new component is created → add to the correct group
- A new API route is added → add to the API mapping table
- A component is renamed or moved → update the file path
- A component is deleted → remove from the map
- A new relationship group emerges → add a new section
