---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# DayMeet Component Relationship Map

When modifying ANY component, you MUST check and update all related components listed here.
Do NOT modify one side of a relationship without checking the other.

## Core Data Flow

```
EventForm → POST /api/events → DB → GET /api/events/[id] → EventPageClient → GridEditor
                                                           → HeatmapGrid / CalendarHeatmapGrid
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
| `useGridDrag` | 드래그 선택 hook. `DragGrid` 가 사용 | `src/components/drag-grid/useGridDrag.ts` |
| `HeatmapLegend` | 결과 히트맵 단계 범례. `EventPageClient`, `DemoEventViewer` 가 사용 | `src/components/results/HeatmapLegend.tsx` |
| `heatmap.ts` | 히트맵 단계와 색 계산(`getStep`, `getStepColor`, `getStepLabels`). `HeatmapGrid`, `CalendarHeatmapGrid`, `HeatmapLegend` 공용 | `src/lib/heatmap.ts` |
| `types.ts` | 공용 타입(`Availability`, `AvailabilityLevel`, `Event`, `Participant`). 컴포넌트, hook, 서버 계층이 폭넓게 import | `src/lib/types.ts` |
| `constants.ts` | 그리드 상수와 슬롯 유틸(`CELL_HEIGHT`, `SLOTS_PER_HOUR`, `slotToTime`, `generateSlots`, `formatDateCompact`, `DAY_OF_WEEK_LABELS`, `isDayOfWeekKey`). 입력 그리드와 결과 그리드가 공유 | `src/lib/constants.ts` |

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
| `ParticipantFilter` | Participant filter (used inside EventPageClient + MobileSlotSheet) | `src/components/results/ParticipantFilter.tsx` |
| `MobileSlotSheet` | 모바일 셀 탭 시 아래에서 올라오는 슬롯 상세 드로어 (`mobileSlotSheet` 상태 기반, `lg:hidden`). 데스크탑은 같은 상태로 popover/사이드바 홀드 | `src/components/event-page/MobileSlotSheet.tsx` |
| `IfNeededLegend` | `■ if needed` 범례. imperative `setVisible`로 호버/탭한 슬롯에 if-needed 응답이 있을 때만 표시 | `src/components/event-page/IfNeededLegend.tsx` |
| `SidebarCount` | 사이드바 응답 수. `SidebarCountHandle.updateForSlot` 으로 호버/홀드한 슬롯 기준 갱신 | `src/components/event-page/SidebarCount.tsx` |
| `HoverPopoverPortal` | 데스크탑 시간 그리드의 호버/홀드 popover 를 Portal 로 렌더 | `src/components/event-page/HoverPopoverPortal.tsx` |
| `MobileBottomBar` | 모바일 하단 고정 바(z-40) | `src/components/event-page/MobileBottomBar.tsx` |
| `CalendarImportButton` | Google 캘린더 일정을 가져와 응답으로 채움. `EventPageClient`, `GridEditor`, `MobileBottomBar` 가 사용 | `src/components/event-page/CalendarImportButton.tsx` |
| `calendar.ts` | Google Calendar API 호출(`fetchCalendarEvents`)과 응답 변환(`calendarEventsToAvailability`) | `src/lib/calendar.ts` |
| `useEvent` | `EventPageClient` 는 React Query 키(`eventQueryKey`)만 import 해서 씀. 같은 파일의 `useEvent`, `useResults`, `useInvalidateEvent` 는 호출처가 없음 | `src/hooks/useEvent.ts` |
| `useAvailabilitySave` | 가용성 저장 hook. `EventPageClient` 가 사용 | `src/hooks/useAvailabilitySave.ts` |
| `useRealtimeSync` | Supabase Realtime(`postgres_changes`) 구독으로 다른 참여자의 변경을 반영 | `src/hooks/useRealtimeSync.ts` |
| `session-store.ts` | 익명 참여자 세션을 localStorage 에 여러 개 보관(`readSessionStore`, `getActiveSession`, `upsertSession`) | `src/lib/session-store.ts` |
| `participantToggle` | `ParticipantFilter` 의 참여자 선택 토글(`toggleParticipant`)과, `EventPageClient` 의 실시간 갱신이 선택 목록을 새 참여자 목록에 맞추는 `reconcileSelection` | `src/components/results/participantToggle.ts` |

**Shared concerns:**
- Event title/description display style
- Participant count/list display format
- Date formatting
- Responsive breakpoints
- `mobileSlotSheet` 상태(`{ date, slot: number | null }`, `slot===null`이면 날짜 전용 `all_day`)는 **셀 선택의 단일 진실 공급원**. 모바일·데스크탑 공용. `EventPageClient.handleCellSelect`가 토글 핸들러 — 같은 셀 재선택 시 `null`로 해제, 다른 셀이면 전환. 양 그리드의 `onCellSelect`가 이 핸들러를 받음.
- 모바일: `mobileSlotSheet`가 있으면 `MobileSlotSheet`(셀 탭 시 아래에서 올라오는 드로어) 표시. 시트가 열리면 본문 응답자 목록은 모바일에서 숨김(`hidden lg:block`), 중복 방지. 시트 닫기는 같은 셀 재탭 / 드래그 / 닫기 버튼.
- 데스크탑: `mobileSlotSheet`가 있으면 = "홀드". `HeatmapGrid.onCellSelect`가 셀 `getBoundingClientRect()`를 `position`으로 전달 → `heldPositionRef`에 저장 → `useEffect`가 `HoverPopoverPortal`(시간 그리드만) + 사이드바(`ParticipantFilter.previewSlot`/`SidebarCount.updateForSlot`/`IfNeededLegend.setVisible`)를 홀드 셀 기준으로 고정. 홀드 중에는 `onCellHover`가 early-return으로 hover 무시. 홀드 해제는 같은 셀 재클릭 / 메인 콘텐츠 2-column 래퍼(`mainContentRef`) 밖 마우스 클릭 / 편집 모드 진입(`handleEditClick`이 `setMobileSlotSheet(null)`). 사이드바 클릭은 래퍼 안이므로 홀드 유지.
- 홀드/선택된 셀은 `selectedCell` prop으로 양 그리드에 전달되어 dashed outline(`outline-2 outline-dashed outline-gray-900 -outline-offset-2`)으로 표시.
- `IfNeededLegend`는 항상 표시가 아니라 **호버/탭한 슬롯에 if-needed(값 1)가 있을 때만** 표시. 데스크탑 사이드바는 `onCellHover` 핸들러가 imperative `setVisible` 호출, `MobileSlotSheet`는 탭한 슬롯의 `slotAvailability`로 자체 계산. 스크롤 컨테이너(`max-h-48 overflow-y-auto`) **바깥**에 렌더해야 안 잘림.
- `HoverInfoPopover`는 `position: absolute` + 페이지 좌표(viewport 좌표 + `scrollX/Y`)로 셀에 앵커됨 — 스크롤 시 셀과 함께 이동(`fixed` 아님).

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
| `proxy.ts` | 세션 갱신(`/dashboard`, `/mypage`, `/auth`)과 POST 속도 제한(이벤트 생성, 참여, 비밀번호 확인, 폴더 생성). Next 16 에서 `middleware.ts` 가 `proxy.ts` 로 바뀜 | `src/proxy.ts` |
| `/auth/callback` | OAuth 로그인 뒤 돌아오는 라우트(`GET`). `code` 를 세션으로 바꾸고(Supabase `@supabase/ssr`) 사이트 주소(`NEXT_PUBLIC_SITE_URL`, 로컬은 요청 origin) 기준으로 `next` 로 보냄. `proxy.ts` 의 세션 갱신 대상 경로 | `src/app/auth/callback/route.ts` |
| `rateLimit` | 요청 횟수 제한. 인스턴스 메모리의 `Map` 에 쌓으므로 서버리스 인스턴스끼리 공유되지 않음. `proxy.ts` 의 `RATE_POLICIES` 가 호출 | `src/lib/rate-limit.ts` |
| `useAuthUser` | 로그인 사용자 hook. `AuthButton`, `HeaderDashboardLink` 가 사용 | `src/hooks/useAuthUser.ts` |
| `InAppBrowserModal` | 인앱 브라우저 사용자에게 외부 브라우저로 열도록 안내하는 모달. `AuthButton`, `EventPageClient` 가 띄움 | `src/components/auth/InAppBrowserModal.tsx` |
| `inAppBrowser.ts` | 인앱 브라우저 판별(`detectInAppBrowser`)과 외부 브라우저 열기(`openInExternalBrowser`). `AuthButton`, `InAppBrowserModal`, `EventPageClient` 가 사용 | `src/lib/inAppBrowser.ts` |
| `auth.ts` | 이벤트 접근 토큰 서명과 검증(`signEventToken`, `verifyEventToken`). API 라우트, `auth-context.ts`, `event-auth.service.ts` 가 사용 | `src/lib/auth.ts` |
| `createBrowserClient` | 브라우저용 Supabase 클라이언트 | `src/lib/supabase/client.ts` |
| `createServerClient` | 서버용 Supabase 클라이언트. API 라우트, 서버 컴포넌트, repositories 가 사용 | `src/lib/supabase/server.ts` |

### Layout (global)

| Component | Role | File |
|-----------|------|------|
| `Logo` | DayMeet 브랜드 마크 (3×3 히트맵 그리드 SVG) — Header/Footer/favicon/apple-icon/OG 공용 | `src/components/brand/Logo.tsx` |
| `Header` | Header | `src/components/layout/Header.tsx` |
| `Footer` | Footer | `src/components/layout/Footer.tsx` |
| `CreateEventButton` | Event creation button | `src/components/layout/CreateEventButton.tsx` |
| `HeaderDashboardLink` | `Header` 의 대시보드 링크. `useAuthUser` 로 로그인 여부를 확인 | `src/components/layout/HeaderDashboardLink.tsx` |
| `QueryProvider` | React Query 전역 provider. `src/app/layout.tsx` 가 앱 전체를 감쌈 | `src/components/providers/QueryProvider.tsx` |

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

### Home / Demo (마케팅 페이지)

| Component | Role | File |
|-----------|------|------|
| `Features` | 홈 기능 소개 섹션. `src/app/page.tsx` 가 조립 | `src/components/home/Features.tsx` |
| `HowItWorks` | 홈 사용 방법 섹션. 단계별 목업을 사용 | `src/components/home/HowItWorks.tsx` |
| `Faq` | 홈 FAQ 섹션 | `src/components/home/Faq.tsx` |
| `Step1Mockup` | `HowItWorks` 의 단계 목업 | `src/components/home/mockups/Step1Mockup.tsx` |
| `Step2Mockup` | `HowItWorks` 의 단계 목업 | `src/components/home/mockups/Step2Mockup.tsx` |
| `Step3Mockup` | `HowItWorks` 의 단계 목업 | `src/components/home/mockups/Step3Mockup.tsx` |
| `DemoEventViewer` | fixture 데이터로 이벤트 화면을 보여주는 뷰어. `src/app/page.tsx`, `src/app/demo/page.tsx`, `src/app/use-cases/[slug]/page.tsx` 가 사용 | `src/components/demo/DemoEventViewer.tsx` |
| `demo-data.ts` | 데모와 유스케이스 fixture(`DEMO_FIXTURE`, `fixtureToEventData`). 위 페이지와 `src/app/sitemap.ts` 가 사용 | `src/lib/demo-data.ts` |
| `render-emphasis.tsx` | `**...**` 마커를 강조로 렌더(`renderEmphasis`, `stripEmphasis`). 홈, 가이드, 데모, 유스케이스 페이지가 사용 | `src/lib/render-emphasis.tsx` |
| `event-history.ts` | 최근 방문 이벤트 기록(`getEventHistory`, `addEventToHistory`, `removeEventFromHistory`). 홈, `EventFormModal`, `EventPageClient` 가 사용 | `src/lib/event-history.ts` |

**Shared concerns:**
- 이벤트 데이터 형태(`Availability`, `EventData`)를 바꾸면 `fixtureToEventData` 와 fixture 도 같이 확인

### Pages (src/app)

앞 절에서 다룬 `/`, `/dashboard`, `/mypage`, `/demo`, `/use-cases/[slug]` 외의 페이지와 레이아웃.

| Route | Role | File |
|-------|------|------|
| `/e/[id]` | 이벤트 페이지 SSR. Supabase 서버 클라이언트로 이벤트를 읽고 이벤트 토큰을 검증(`verifyEventToken`)한 뒤 `EventPageClient` 에 넘김 | `src/app/e/[id]/page.tsx` |
| `/e/[id]` layout | 이벤트별 메타데이터 생성(`generateMetadata`) | `src/app/e/[id]/layout.tsx` |
| `/e/[id]/results` | 호환용 경로. `/e/[id]` 로 redirect | `src/app/e/[id]/results/page.tsx` |
| `/new` | 이벤트 생성 페이지. `EventForm` 렌더 | `src/app/new/page.tsx` |
| `/guide` | 사용 가이드. `renderEmphasis` 사용 | `src/app/guide/page.tsx` |
| `/use-cases` | 유스케이스 목록. `demo-data.ts` 의 `USE_CASE_FIXTURES` 사용 | `src/app/use-cases/page.tsx` |
| `/privacy` | 개인정보 처리방침 | `src/app/privacy/page.tsx` |
| `/terms` | 이용약관 | `src/app/terms/page.tsx` |

### Server Layers (API route → service → repository)

v1.0 리팩토링(#48)으로 생긴 서버 계층. 요청은 `src/app/api/**/route.ts` 에서 시작해 service 를 거쳐 repository 의 Supabase 쿼리로 내려간다. 응답은 항상 `ApiResponse<T>` envelope.

| Component | Role | File |
|-----------|------|------|
| `withApiHandler` | route 공통 래퍼. `paramsSchema`, `bodySchema` 를 zod 로 검증하고 던져진 `ApiError` 를 envelope 응답으로 변환 | `src/server/http/api-handler.ts` |
| `getAuthContext` | 요청에서 로그인 사용자와 이벤트 토큰을 읽음(`AuthContext`) | `src/server/http/auth-context.ts` |
| `ApiError` | 오류 클래스 계열(`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`) | `src/server/http/errors.ts` |
| `ok` / `created` / `fail` | 응답 envelope 생성 | `src/server/http/response.ts` |
| `ApiResponse` | envelope 타입(`ApiResponse`, `ApiErrorBody`, `ApiErrorCode`, `ApiMeta`). 서버와 클라이언트 공용 | `src/types/api.ts` |
| `EventDetail` | 이벤트 DTO 타입(`EventRow`, `EventDetail`, `CreateEventInput`) | `src/types/event.ts` |
| `event.schema.ts` | `eventIdParamsSchema`, `createEventSchema`, `updateEventSchema`, `activeEventsSchema` | `src/server/validators/event.schema.ts` |
| `event-auth.schema.ts` | `verifyPasswordSchema` | `src/server/validators/event-auth.schema.ts` |
| `participant.schema.ts` | `participantParamsSchema`, `participantPidParamsSchema`, `joinParticipantSchema`, `updateAvailabilitySchema` 등 | `src/server/validators/participant.schema.ts` |
| `folder.schema.ts` | `folderIdParamsSchema`, `folderNameSchema`, `assignEventFolderSchema`, `reorderFoldersSchema`, `reorderEventsSchema` | `src/server/validators/folder.schema.ts` |
| `user.schema.ts` | `updateProfileSchema` | `src/server/validators/user.schema.ts` |
| `eventsService` | 이벤트 생성, 상세, 수정, 소프트 삭제, 활성 id 필터(`create`, `getDetail`, `update`, `softDelete`, `listActiveIds`). events, participants, profiles repo 사용 | `src/server/services/events.service.ts` |
| `eventAuthService` | 이벤트 비밀번호 확인(`verifyPassword`). events repo 사용 | `src/server/services/event-auth.service.ts` |
| `authService` | 권한 확인(`requireEventOwner`, `requireUser`). events repo 사용 | `src/server/services/auth.service.ts` |
| `participantsService` | 참여, 가용성 수정, 삭제(`join`, `updateAvailability`, `remove`). events, participants repo 사용 | `src/server/services/participants.service.ts` |
| `resultsService` | 결과 집계(`getResults`). events, participants, profiles repo 사용 | `src/server/services/results.service.ts` |
| `foldersService` / `eventReorderService` | 폴더 CRUD, 이벤트 폴더 배정, 폴더와 카드 순서 일괄 변경. events, folders, participants, profiles, user-event-folders, user-event-order repo 사용 | `src/server/services/folders.service.ts` |
| `userService` | 프로필 조회와 이름 수정(`getProfile`, `updateDisplayName`). profiles repo 사용 | `src/server/services/user.service.ts` |
| `eventsRepo` | `events` 테이블 쿼리 | `src/server/repositories/events.repo.ts` |
| `participantsRepo` | `participants` 테이블 쿼리 | `src/server/repositories/participants.repo.ts` |
| `foldersRepo` | `folders` 테이블 쿼리 | `src/server/repositories/folders.repo.ts` |
| `profilesRepo` | `profiles` 테이블 쿼리 | `src/server/repositories/profiles.repo.ts` |
| `userEventFoldersRepo` | `user_event_folders` 테이블 쿼리 | `src/server/repositories/user-event-folders.repo.ts` |
| `userEventOrderRepo` | `user_event_order` 테이블 쿼리 | `src/server/repositories/user-event-order.repo.ts` |

**Shared concerns:**
- `ApiResponse` envelope 를 바꾸면 `response.ts`, `api-handler.ts`, `apiClient` 가 모두 영향을 받음
- 새 API 라우트는 아래 API ↔ Component Mapping 표에도 추가

### API Client (브라우저 → /api)

| Component | Role | File |
|-----------|------|------|
| `apiClient` | `/api` 호출 공통 클라이언트(`apiClient`, `ApiClientError`) | `src/lib/api-client/client.ts` |
| `eventsApi` | `create`, `getDetail`, `update`, `remove`, `listActiveIds` | `src/lib/api-client/events.api.ts` |
| `foldersApi` | 폴더 관련 호출 | `src/lib/api-client/folders.api.ts` |
| `participantsApi` | 참여와 가용성 저장 호출. 같은 파일에 `eventAuthApi`(비밀번호 확인)와 `resultsApi`(결과 조회) | `src/lib/api-client/participants.api.ts` |
| `userApi` | 프로필 조회와 수정 호출 | `src/lib/api-client/user.api.ts` |

## Modification Rules

1. **Grid color change** → update `getCellColorClass`/`getCellCssColor` in `GridCell.tsx` → verify all 7 grid components
2. **Cell size change** → input grids AND result heatmaps must match
3. **Date format change** → update `formatDateCompact()` only (already shared)
4. **Time display change** → update `slotToTime()` + verify time labels in all grids
5. **Participant display change** → `EventPageClient` + `ParticipantFilter` + `MobileSlotSheet` simultaneously
6. **Button/input style change** → verify all form components + modals + auth forms for consistency
7. **Responsive change** → follow the breakpoint patterns already in the code, verify ALL pages

## API ↔ Component Mapping

| API Route | Consuming Components |
|-----------|---------------------|
| `POST /api/events` | EventForm (`eventsApi.create`) |
| `GET /api/events/[id]` | EventPageClient, PasswordForm (둘 다 `eventsApi.getDetail` 직접 호출) |
| `POST /api/events/active` | 홈 `src/app/page.tsx` (`eventsApi.listActiveIds`, 로컬 이벤트 기록 중 삭제되지 않은 id 만 추림) |
| `POST /api/events/[id]/participants` | NameForm → EventPageClient |
| `PATCH /api/events/[id]/participants/[pid]` | EventPageClient (`useAvailabilitySave`) |
| `GET /api/events/[id]/results` | 현재 클라이언트 호출 없음 (`resultsApi.getResults` 는 호출처 없는 `useResults` 안에서만 쓰임) |
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

After any of these changes, run `npm run check:map`. It compares this file with the code, and CI runs it too.
