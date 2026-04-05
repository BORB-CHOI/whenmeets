<!-- /autoplan restore point: /c/Users/qzsec/.gstack/projects/BORB-CHOI-whenmeets/main-autoplan-restore-20260404-165255.md -->

# /autoplan Review: WhenMeets v2 — 전면 리뉴얼 + 신기능 + 인프라

**Source:** Design doc from /office-hours (2026-04-04)
**Branch:** main | **Base:** main | **Platform:** GitHub
**Mode:** SELECTIVE EXPANSION (per autoplan P1+P2)
**Design doc:** `~/.gstack/projects/BORB-CHOI-whenmeets/qzsec-main-design-20260404-074121.md`

## Plan Summary

20-item v2 overhaul for WhenMeets (free when2meet alternative targeting Korean users):
- **Phase 1:** Google OAuth + DB schema migration + dashboard + schedule presets
- **Phase 2:** Full design overhaul (DESIGN.md/indigo theme) + overlay availabilities + dates-only mode + unavailable-time mode + UX fixes
- **Phase 3:** Google Calendar integration + timezone support + performance optimization + AdSense

Approach: Infrastructure-first (B) — auth foundation before features.

---

## Phase 1: CEO Review (SELECTIVE EXPANSION)

### Premises (pending user confirmation)

1. **timeful ~80% UX reference** — Valid. DESIGN.md captures differentiation (indigo, Pretendard, mesh gradient). But "80% clone" framing is strategically weak. Recommendation: reframe as "own design system inspired by timeful patterns" not "80% copy."
2. **비로그인=이름만, 로그인=Google** — Valid, user-confirmed preference. Dual-index approach is sound.
3. **20 items in one v2** — Valid IF Phase 2 has internal priority ordering for cut line. 12 items in Phase 2 is heavy.
4. **Performance = cold start** — Partially valid. Real perf concern in v2 will be overlay realtime + heatmap recalc, not just cold start.
5. **Calendar = OAuth prerequisite, readonly** — Valid. Two-phase OAuth is correct.

### What Already Exists (sub-problem → existing code)

| Sub-problem | Existing Code | Reuse |
|-------------|--------------|-------|
| Auth flow | `src/lib/auth.ts` (HMAC) | Replace with Supabase Auth |
| Grid editing | `DragGrid`, `GridCell`, `useGridDrag` | Extend for overlay, dates-only, unavailable mode |
| Results view | `HeatmapGrid`, `ParticipantFilter` | Extend for hover-highlight, best-times |
| Event creation | `EventForm`, `DatePicker`, `TimeRangePicker` | Add mode/date-only toggles |
| Realtime | Supabase channel in `e/[id]/page.tsx` | Already wired, extend for overlay |
| Supabase client | `src/lib/supabase/client.ts`, `server.ts` | Keep, add auth helpers |
| Validation | API route validators | Extend for new fields (mode, date_only) |

### NOT in Scope (deferred items)

| Item | Reason | Deferred To |
|------|--------|-------------|
| Dark mode | DESIGN.md specifies it but v2 scope is already XL | TODOS.md (post-v2) |
| AI-suggested optimal times | 12-month ideal, not v2 | TODOS.md |
| Multi-provider OAuth (GitHub, Apple) | Google covers 95% of Korean users | TODOS.md |
| Native mobile app | Web responsive is sufficient for v2 | TODOS.md |
| Event editing after creation | Nice-to-have, not in plan | TODOS.md |
| Read-write calendar sync | Plan correctly limits to readonly | TODOS.md |
| Full DST-aware timezone | Plan correctly defers complex tz to post-v2 | TODOS.md |

### Error & Rescue Registry

| Scenario | Current Handling | Plan Specifies | Recommendation |
|----------|-----------------|----------------|----------------|
| Supabase down | Generic error state | Nothing | Add graceful degradation message |
| OAuth flow fails/cancelled | N/A | Nothing | Add retry UI + "continue as guest" fallback |
| Realtime disconnects | Refetch on reconnect | Nothing | Add connection indicator + polling fallback |
| Deleted event access | 404 | Nothing | Add "event not found" page with CTA |
| Name collision (anon) | 409 + token check | Overwrite confirmation | Good, already specified |
| Calendar token expired | N/A | "다시 연결" button | Good, acknowledged as limitation |
| Grid save fails | No visible indicator | Nothing | Add save status indicator (saving/saved/error) |

### Failure Modes Registry

| Mode | Trigger | Impact | Mitigation |
|------|---------|--------|------------|
| Auth migration breaks existing events | Phase 1 DB migration | HIGH — existing participants lose access | Migration must preserve existing token-based auth temporarily |
| Overlay performance on large events | >10 participants, 30+ slots | MEDIUM — janky rendering | Debounce overlay recalc, virtualize if needed |
| Phase 2 scope creep | 12 items, no cut line | HIGH — v2 never ships | Add P1/P2 priority within Phase 2 |
| KakaoTalk link preview missing | No OG tags | HIGH — distribution failure | Add to Phase 1 |
| Lighthouse regression from AdSense | Phase 3 | MEDIUM — below 85 target | Lazy-load ad scripts |

### Dream State Delta

v2 gets WhenMeets to ~60% of the 12-month ideal. The biggest gaps remaining after v2: analytics/insights, multi-provider OAuth, AI suggestions, native app, write-back calendar. The plan correctly focuses on the foundation that makes these future additions possible.

### CEO Completion Summary

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Value Proposition | 7/10 | "Figma for group time" is strong but plan doesn't carry it through. Overlay should be hero feature. |
| Error Handling | 4/10 | Zero error states specified. Critical gap. |
| User Journey | 6/10 | Good flow but login/name modal needs more specificity. KakaoTalk entry point undesigned. |
| Competitive Position | 5/10 | Reads as "timeful clone + indigo" not "tool that solves X problem differently." |
| Monetization | 5/10 | AdSense is validation not revenue. Fine for v2. |
| Security | 8/10 | OAuth migration is sound. Dual-index is clean. |
| Data Model | 9/10 | JSONB schema is proven and well-extended. |
| Scope | 6/10 | 20 items ambitious but phased. Phase 2 needs internal priority. |
| Distribution | 3/10 | CRITICAL: No KakaoTalk OG preview, no viral mechanics. |
| Success Metrics | 4/10 | All technical metrics, no user-facing metrics. |

### Recommended Additions to Plan

1. **Phase 1: KakaoTalk OG meta tags** — title, description, image preview for link sharing
2. **Phase 2: Empty/error/loading states** for all new UI (dashboard, preset editor, overlay)
3. **Phase 2: Basic analytics** — event creation count, participant joins, grid completion rate
4. **Phase 2: Internal priority** — mark items as P1 (must ship) vs P2 (can defer)
5. **Success criteria: User metrics** — "50 real events by real groups in 30 days post-launch"
6. **Migration safety** — preserve token-based auth during transition period

---

## Phase 2: Design Review (7 Dimensions)

### Design Completeness: 5/10

DESIGN.md is excellent as a component library spec (colors, spacing, shadows, motion). But the v2 plan treats it as "just apply DESIGN.md" without specifying interaction design, state management, or responsive behavior for each new feature.

### CLAUDE SUBAGENT (Design — independent review)

**CRITICAL findings:**
1. No first-visit vs return-visit distinction — empty heatmap = dead end for first visitor
2. Zero loading states across entire plan (event load, OAuth, preset apply, screenshot)
3. Zero error states (OAuth fail, Supabase down, realtime disconnect, clipboard denied)
4. Mobile grid touch interaction unspecified — 3-state cells + overlay conflict with scroll
5. Three grid modes with no shared component architecture — implementer will build 3 grids or refactor mid-build
6. Realtime + overlay + auto-save data flow unspecified — source of truth, conflict resolution, update granularity
7. Mobile grid layout hand-waved — 7-day x 24-slot grid doesn't fit 375px at 28px cell height
8. Zero accessibility spec — Text Muted fails WCAG AA (2.85:1), no keyboard nav, no colorblind patterns

**HIGH findings:**
1. Sidebar participant list undefined (desktop/tablet/mobile)
2. No save indicator for grid editing
3. Wall of 5 choices on /new page — needs progressive disclosure
4. Mode confusion: results default vs always-show grid — subagent recommends grid always visible
5. "timeful style" is not a spec — each reference needs specific layout description
6. Overlay opacity formula maxes at 5 people (linear) — needs logarithmic scale
7. Tablet layout is a throwaway line
8. No focus management after modals

**Big recommendation:** Split Phase 2 into 2a (decompose monolith + apply design) and 2b (new features).

**Codex:** Unavailable. `[subagent-only]`

### Design Dimension Scores

| Dimension | Score | Key Issue |
|-----------|-------|-----------|
| 1. Information Hierarchy | 5/10 | No first-visit state, sidebar undefined |
| 2. Interaction States | 3/10 | Zero loading/error/empty states |
| 3. User Journey | 6/10 | Good flow but dead zones and friction points |
| 4. Specificity | 4/10 | "timeful style" references instead of concrete specs |
| 5. Implementer Clarity | 4/10 | 3 grids, no shared component, no data flow |
| 6. Responsive | 4/10 | Mobile grid unsolved, tablet throwaway |
| 7. Accessibility | 2/10 | Zero spec, contrast failures, no keyboard nav |

---

### CLAUDE SUBAGENT (CEO — strategic independence)

**Key concerns:**
1. CRITICAL: Distribution gap — 20 features, zero adoption strategy
2. HIGH: "80% timeful" is clone strategy, not product strategy
3. HIGH: Recommends swapping Phase 1↔2 (visual before auth)
4. MEDIUM: Cut to 12 items with hard cut line
5. MEDIUM: Missing KakaoTalk OG, analytics, reminders

**Codex:** Unavailable (ChatGPT account limitation). `[subagent-only]`

---

## Phase 3: Eng Review

### Architecture Diagram (Current → v2)

```
CURRENT MVP:
┌─────────────────────────────────────────────────┐
│  /app/page.tsx (landing)                        │
│  /app/new/page.tsx → EventForm                  │
│  /app/e/[id]/page.tsx (367-line MONOLITH)       │
│    ├── password check → name input → grid edit  │
│    ├── DragGrid + GridCell + useGridDrag        │
│    ├── ModeSwitch (3 states)                    │
│    └── Realtime subscription + debounced save   │
│  /app/e/[id]/results/page.tsx                   │
│    ├── HeatmapGrid + ParticipantFilter          │
│    └── Realtime subscription                    │
│  /api/events/* (5 routes, service role key)     │
│  /lib/auth.ts (HMAC) + supabase/client+server  │
└─────────────────────────────────────────────────┘

v2 TARGET:
┌─────────────────────────────────────────────────┐
│  /app/page.tsx (landing, mesh gradient)         │
│  /app/new/page.tsx → EventForm + mode toggles   │
│  /app/e/[id]/page.tsx (DECOMPOSED)              │
│    ├── EventLoader (fetch + error handling)     │
│    ├── AuthGate (OAuth modal / name input)      │
│    ├── ResultsView (default, heatmap + sidebar) │
│    │   ├── HeatmapGrid (extended)               │
│    │   ├── ParticipantSidebar (hover highlight) │
│    │   ├── BestTimesToggle + HideIfNeeded       │
│    │   └── ScreenshotButton                     │
│    ├── GridEditor (editing mode)                │
│    │   ├── AvailabilityGrid (shared base)       │
│    │   │   ├── DateTimeGrid variant             │
│    │   │   ├── DateOnlyGrid variant             │
│    │   │   └── PresetGrid variant               │
│    │   ├── OverlayLayer (others' responses)     │
│    │   ├── ModeSwitch (mode-aware labels)       │
│    │   └── CalendarImportButton                 │
│    └── SaveIndicator + ConnectionStatus         │
│  /app/dashboard/page.tsx (NEW, auth required)   │
│    ├── MyEventsTab + EventCard                  │
│    └── PresetsTab + PresetEditor                │
│  /app/privacy/page.tsx (NEW)                    │
│  /api/events/* (extended, dual-auth)            │
│  /api/dashboard/* (NEW, session-aware client)   │
│  /lib/supabase/auth.ts (NEW, Supabase Auth)     │
│  /middleware.ts (NEW, auth session refresh)      │
└─────────────────────────────────────────────────┘
```

### CLAUDE SUBAGENT (Eng — independent review)

**CRITICAL findings:**
1. Token removal breaks all existing anonymous participants — localStorage entries orphaned, PATCH crashes
2. Deploy ordering hazard — DROP COLUMN with cached Vercel workers = column-not-found errors

**HIGH findings:**
1. 367-line page.tsx monolith cannot absorb 11 new features — needs decomposition before v2
2. Name-based auth trivially bypassable — names visible in GET response (user chose "도용 허용" deliberately)
3. Case-insensitive uniqueness lost — plan drops lower() from index
4. Zero integration tests — no API route tests, no migration test
5. Overlay data: full refetch per change at scale = 500KB per event

**MEDIUM findings (9):**
DragGrid mode coupling, service role for all ops, realtime N+1, JSONB validation gaps, no CSRF protection, dashboard auth unspecified, preset mapping edges, calendar OAuth UX, slot key validation

**Recommended sequence:** Decompose page.tsx → 4-phase migration → features

**Codex:** Unavailable. `[subagent-only]`

### Eng Consensus Table

```
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               REFACTOR N/A   [subagent-only]
  2. Test coverage sufficient?         NO       N/A   [subagent-only]
  3. Performance risks addressed?      NO       N/A   [subagent-only]
  4. Security threats covered?         ISSUES   N/A   [subagent-only]
  5. Error paths handled?              NO       N/A   [subagent-only]
  6. Deployment risk manageable?       HIGH     N/A   [subagent-only]
═══════════════════════════════════════════════════════════════
Single voice only. Codex unavailable.
```

### Test Coverage Map

| Codepath | Type | Exists? | Gap |
|----------|------|---------|-----|
| Event creation (POST /api/events) | Integration | NO | Need: validation, password hash, response shape |
| Participant join (POST) | Integration | NO | Need: name conflict, auth check, dual-auth |
| Availability update (PATCH) | Integration | NO | Need: token auth, name auth, JSONB validation |
| OAuth login flow | E2E | NO | Need: Google redirect, session creation, error handling |
| Dashboard CRUD | Integration | NO | Need: auth guard, preset CRUD, event listing |
| DB migration on existing data | Migration | NO | Need: test with realistic seed data + duplicate names |
| Realtime overlay updates | Integration | NO | Need: delta propagation, conflict resolution |
| Grid drag mechanics | Unit | YES | Extend for unavailable mode + date-only |
| Heatmap calculations | Unit | YES | Extend for best-times, hide-if-needed |
| HMAC auth | Unit | YES | Will be replaced by Supabase Auth |
| Slot/time helpers | Unit | YES | Extend for timezone offset |

### Eng Completion Summary

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| Architecture | 4/10 | 367-line monolith must decompose. No shared grid component spec. |
| Migration Safety | 3/10 | DROP COLUMN on live table with no phased approach. Token removal orphans users. |
| Test Coverage | 3/10 | Zero integration tests. Migration untested. |
| Performance | 5/10 | Overlay full-refetch won't scale. Realtime N+1. |
| Security | 6/10 | OAuth is sound. Name-auth is user's choice. JSONB validation missing. |
| Error Handling | 3/10 | No error states, no retry logic, no degradation. |
| Deployment | 4/10 | No phased migration plan. No rollback strategy. |

### Revised Phase Sequence (Eng Recommendation)

```
Phase 0 (NEW): Foundation
  ├── Decompose page.tsx into EventLoader, AuthGate, ResultsView, GridEditor
  ├── Create AvailabilityGrid shared base component
  ├── Add integration test infrastructure (API route tests)
  ├── Add KakaoTalk OG meta tags
  └── Estimated: CC ~2 hours

Phase 1: Infrastructure (as planned, with migration fix)
  ├── 1a: Add columns (user_id, mode, date_only, created_by) + deploy dual-auth code
  ├── 1b: Google OAuth + dashboard + presets
  ├── 1c: 2-week soak, then remove token auth code
  ├── 1d: DROP COLUMN token (separate migration)
  └── Add: auth middleware helper, session-aware Supabase client

Phase 2a: Design System Application
  ├── emerald → indigo color migration
  ├── Inter → Pretendard font swap
  ├── Responsive layout (mobile/tablet/desktop)
  ├── All component styles per DESIGN.md
  ├── Loading/error/empty states
  └── Accessibility baseline (contrast, keyboard, reduced-motion)

Phase 2b: Core Features
  ├── Overlay availabilities (with delta-based updates)
  ├── Dates-only mode
  ├── Unavailable-time mode
  ├── Best times + Hide if needed
  ├── Hover → participant highlight
  ├── Screenshot copy
  └── UX fixes (#1-5)

Phase 3: External Integration (as planned)
  ├── Google Calendar (readonly)
  ├── Timezone support
  ├── Performance optimization
  └── AdSense
```

---

## Cross-Phase Themes

**Theme 1: State specification gap** — Flagged in Phase 1 (CEO: error handling 4/10), Phase 2 (Design: interaction states 3/10), Phase 3 (Eng: error handling 3/10). ALL THREE phases independently identified that the plan specifies zero loading/error/empty states. High-confidence signal: this is the plan's biggest gap.

**Theme 2: Monolith decomposition** — Flagged in Phase 2 (Design: shared component architecture) and Phase 3 (Eng: 367-line page.tsx). Both phases independently concluded the monolith must decompose BEFORE new features.

**Theme 3: Migration safety** — Flagged in Phase 1 (CEO: failure modes registry) and Phase 3 (Eng: token removal + deploy ordering). The DROP COLUMN approach is dangerous on a live table.

---

## APPROVED PLAN — Final Phase Sequence

**User decisions applied:** 결과 뷰 기본 유지 / `"all_day"` 슬롯 키 / Phase 2 분할

```
Phase 0: Foundation (NEW)
  ├── page.tsx 모놀리스 분해 → EventLoader, AuthGate, ResultsView, GridEditor
  ├── AvailabilityGrid 공유 기반 컴포넌트 생성
  ├── 통합 테스트 인프라 구축 (API route tests)
  ├── 카카오톡 OG 메타 태그 추가
  └── CC ~2시간

Phase 1: 인프라 (4단계 마이그레이션)
  ├── 1a: 새 컬럼 추가 (user_id, mode, date_only, created_by) + 듀얼 인증 코드 배포
  ├── 1b: Google OAuth + 대시보드 + 프리셋 (dates-only: "all_day" 키 사용)
  ├── 1c: 2주 안정화 후 토큰 인증 코드 제거
  ├── 1d: token 컬럼 DROP (별도 마이그레이션)
  └── 추가: auth 미들웨어 헬퍼, 세션 기반 Supabase 클라이언트

Phase 2a: 디자인 시스템 적용
  ├── emerald → indigo 컬러 마이그레이션
  ├── Inter → Pretendard 폰트 전환
  ├── 반응형 레이아웃 (모바일: 가로 스크롤+스냅 / 태블릿 / 데스크탑)
  ├── DESIGN.md 전체 컴포넌트 스타일 적용
  ├── 로딩/에러/빈 상태 시스템 추가
  └── 접근성 기본 (대비, 키보드, reduced-motion)

Phase 2b: 핵심 기능
  ├── Overlay availabilities (델타 기반 업데이트, 로그 스케일 opacity)
  ├── Dates-only 모드 ("all_day" 키)
  ├── 안 되는 시간 수합 모드
  ├── Best times + Hide if needed 토글
  ├── Hover → 참가자 하이라이트
  ├── 스크린샷 복사
  ├── 모바일 터치: 탭=순환, 길게 누르기=드래그
  └── UX 수정 (#1-5)

Phase 3: 외부 연동 (기존 플랜 유지)
  ├── Google Calendar (readonly)
  ├── 타임존 지원
  ├── 성능 최적화
  └── AdSense
```

### Deferred to TODOS.md

| Item | Reason |
|------|--------|
| 다크 모드 | v2 스코프 이미 XL |
| AI 최적 시간 제안 | 12개월 이상 |
| 멀티 OAuth (GitHub, Apple) | Google이 한국 95% 커버 |
| 네이티브 앱 | 반응형 웹으로 충분 |
| Read-write 캘린더 동기화 | Readonly으로 충분 |
| 완전한 DST 타임존 | v2는 단순 오프셋만 |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ✅ clean | Distribution gap (critical), 5 additions recommended |
| Codex Review | `codex exec` | Independent 2nd opinion | 0 | ⚠️ unavailable | ChatGPT account limitation |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | ⚠️ issues_open | 2 critical (migration), 5 high, 9 medium |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ⚠️ issues_open | 8 critical (states, a11y), 8 high |
| CEO Voices | autoplan-voices | Dual perspective | 1 | subagent-only | Codex unavailable |
| Eng Voices | autoplan-voices | Dual perspective | 1 | subagent-only | Codex unavailable |
| Design Voices | autoplan-voices | Dual perspective | 1 | subagent-only | Codex unavailable |

**VERDICT:** APPROVED with modifications. 32 decisions made (29 auto, 3 user). All critical findings addressed in revised plan. Next step: `/ship` when ready to create PR, or start implementation with Phase 0.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|----------|
| 1 | CEO | Mode: SELECTIVE EXPANSION | Mechanical | P1+P2 | 20-item scope already large, expand only in blast radius | SCOPE EXPANSION, REDUCTION |
| 2 | CEO | Keep infra-first phasing (Approach B) | Taste | P3 | Auth is foundation dependency; subagent disagrees (wants core-first) | Approach A (core-first) |
| 3 | CEO | Add KakaoTalk OG preview to Phase 1 | Mechanical | P1+P2 | Distribution is #1 gap. OG meta tags are <1h CC effort, in blast radius | None |
| 4 | CEO | Keep timezone in Phase 3 | Mechanical | P3 | Target is KR users (KST), tz is nice-to-have not core | Cut timezone entirely |
| 5 | CEO | Keep AdSense in Phase 3 | Mechanical | P6 | Revenue even small validates model. Defer but don't cut. | Cut AdSense |
| 6 | CEO | Add empty/error/loading states to Phase 2 | Mechanical | P1 | Completeness — every UI needs these states | Skip states |
| 7 | CEO | Add basic analytics tracking (Phase 2) | Mechanical | P1+P2 | Can't improve what you don't measure. Simple event tracking. | Defer entirely |
| 8 | Design | Add zero-response state for event page | Mechanical | P1 | First visitor sees empty heatmap = dead end. Show "Be the first" CTA. | Ignore |
| 9 | Design | Specify sidebar participant list (desktop/tablet/mobile) | Mechanical | P1 | Hover-highlight depends on it. Desktop=sticky 280px, mobile=bottom sheet. | Leave unspecified |
| 10 | Design | Add skeleton loading system | Mechanical | P1 | Zero loading states specified across entire plan. | Ignore |
| 11 | Design | Add error component system (inline/toast/full-page/banner) | Mechanical | P1 | Zero error states. Critical for production readiness. | Ignore |
| 12 | Design | Add save indicator near grid header | Mechanical | P1 | Users need feedback that drag changes are being saved. | No indicator |
| 13 | Design | Progressive disclosure on /new page | Mechanical | P5 | 5 decision points too many. Dates-only + mode toggles → "Advanced options." | Keep flat |
| 14 | Design | Add share-optimized screen after event creation | Mechanical | P3 | Dead zone between creation and first response. Web Share API + live counter. | Plain redirect |
| 15 | Design | Specify mobile touch: tap=cycle, long-press=drag mode | Mechanical | P5 | 3-state cells + overlay conflict with mobile scroll. Must be explicit. | Leave ambiguous |
| 16 | Design | Use logarithmic overlay opacity scale | Mechanical | P3 | Linear formula maxes at 5 people. Log scale works to 16+. | Keep linear |
| 17 | Design | Specify shared AvailabilityGrid base component | Mechanical | P4 | 3 grid modes + preset editor = 4 grids sharing same logic. DRY. | Build 3 separate |
| 18 | Design | Specify data flow: source of truth, optimistic updates, conflict resolution | Mechanical | P5 | Overlay + realtime + auto-save needs explicit state management spec. | Leave to implementer |
| 19 | Design | Add horizontal scroll + snap points for mobile grid | Mechanical | P1 | 7-day grid doesn't fit 375px. Must pick: scroll or day-by-day swipe. | Hand-wave |
| 20 | Design | Add accessibility: keyboard nav, contrast fix, reduced motion, colorblind patterns | Mechanical | P1 | Zero a11y spec in plan or DESIGN.md. Text Muted fails WCAG AA. | Ignore a11y |
| 21 | Design | Default view: results (current plan) | Taste→USER | P5 | User confirmed: results view default. Overlay is optional toggle in edit mode. | Always-show grid |
| 22 | Design | Dates-only slot key: "all_day" | Taste→USER | P5 | User chose "all_day" — self-documenting over numeric consistency. | "0" |
| 23 | Design | Split Phase 2 into 2a + 2b | Taste→USER | P1+P3 | User chose split. 2a=decompose+design, 2b=features. | Single Phase 2 |
| 24 | Eng | 4-phase token migration (dual-auth → add columns → drop token code → drop column) | Mechanical | P1 | DROP COLUMN on live table with cached Vercel workers = crash. Must phase. | Single migration |
| 25 | Eng | Decompose page.tsx before Phase 1 features | Mechanical | P4+P5 | 367-line monolith + 11 new features = 1200 lines of tangled state. Must decompose first. | Add features to monolith |
| 26 | Eng | Add lower() to new anon unique index | Mechanical | P1 | Plan drops existing lower() index. "Alice" and "alice" would coexist. | Case-sensitive index |
| 27 | Eng | Add integration tests + migration test before Phase 1 | Mechanical | P1 | Zero API route tests. Migration on live data needs testing. | Ship without tests |
| 28 | Eng | Delta-based overlay updates (not full refetch) | Mechanical | P3 | 50 participants x 14 dates x 48 slots = 500KB per refetch per change. Use realtime deltas. | Full refetch |
| 29 | Eng | Use session-aware Supabase client for auth routes | Mechanical | P5 | Service role key bypasses RLS. v2 user-owned data (presets) needs per-user auth. | Keep service role |
| 30 | Eng | Keep token column nullable (not drop) | Taste | P1+P5 | Eng subagent: names visible in GET → trivial impersonation. User explicitly chose "도용 허용". | — |
| 31 | Eng | Add auth middleware helper for dashboard routes | Mechanical | P4 | Plan has 4+ auth-required routes with no shared helper. Repetition guaranteed. | Manual getUser() per route |
| 32 | Eng | Validate JSONB slot keys (numeric 0-95, per-date limits) | Mechanical | P1 | No validation on slot range. Allows "999999": 2 in availability. | No validation |

