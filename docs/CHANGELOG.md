# Changelog

All notable changes to WhenMeets will be documented in this file.

> 버전은 [SemVer](https://semver.org/)를 따르며, `package.json`의 `version` 필드가 source of truth.

## [Unreleased]

## [0.5.0] - 2026-05-07

### Added

- 개인정보처리방침(`/privacy`), 이용약관(`/terms`) 페이지 — AdSense 승인 필수 조건 충족
- Google AdSense 환경변수 스캐폴딩 (`AdSenseScript`, `AdSlot`, `FloatingAds` 컴포넌트) — `NEXT_PUBLIC_ADSENSE_CLIENT` 비어 있으면 광고 컴포넌트 + ads.txt 모두 자동 비활성. PC 2xl(1536px+) 좌·우 하단 + 모바일(<lg) 하단 배너, 이벤트 페이지 모바일에서는 `MobileBottomBar` 충돌 회피 위해 비표시. 모바일 광고 활성 시 `body { padding-bottom }` 자동 주입으로 콘텐츠 가림 방지
- `/ads.txt` 라우트 핸들러 — IAB 표준 ads.txt를 환경변수 기반으로 자동 생성 (publisher ID 없으면 404)
- 마이그레이션 010: `events.dates` 컬럼 `DATE[]` → `TEXT[]` (서브쿼리 없는 USING 캐스트)
- Footer에 GitHub Issues 연락처 링크
- 대시보드 이벤트 삭제 시 `ConfirmModal` (응답자 삭제와 동일 패턴)

### Changed

- 이벤트/대시보드/마이페이지 페이지 outer 컨테이너 통일: `max-w-4xl mx-auto px-4 py-8 sm:py-12` — 페이지 이동 시 좌·우 여백 일정
- 이벤트 페이지 사이드바: `lg:w-80` (320px) → `lg:w-60` (240px), `pl-6` → `pl-5` — 그리드 가로 폭 +84px 확보
- AvailabilityGrid 시간 컬럼: 44/24px → 20/18px — 그리드 가로 폭 추가 확보
- AvailabilityGrid `containerWidth` 계산식의 `-16` 차감 제거 — 그리드가 부모 폭 가득 채움 + 새로고침 시 0.5초 후 미세 축소 깜빡임 제거
- 랜딩 페이지: `min-h-[calc(100dvh-200px)]` 제거, `py-20 sm:py-28`. 그라디언트를 `from-teal-50 to-gray-50` 수직으로 변경(footer bg와 매칭). Footer `mt-16` 제거 — 콘텐츠와 footer 사이 흰 공백 제거
- `EventFormModal`: 열 때마다 모든 폼 state 초기화 — 재오픈 시 "수정 중..." 멈춤 해소
- `DayOfWeekPicker`: 드래그 시 매 셀마다 `onDaysChange` 호출 → `previewSet` 로컬 state로 미리보기 후 pointer-up에 commit — 드래그 렉 제거
- `PasswordForm` 입장 버튼: `h-[38px] py-3` 충돌 제거 → `py-3`만 사용. 텍스트 수직 비대칭 해소
- `.env.example`: 주석 정리, OS별 hex 생성 명령을 PowerShell 한 줄로 통일

### Fixed

- 비밀번호 보호 이벤트 첫 방문 시 비밀번호 통과 후에도 PasswordForm이 사라지지 않던 버그 (`!session` gate가 첫 방문 stored=null인 사용자에게 영구히 true) — `passwordVerified` 플래그 추가
- 모바일 그리드 터치 시 iOS ghost click(touchend ~300ms 후 합성 mousedown)이 `handlePointerStart`를 재호출해 방금 칠한 셀을 토글-삭제하던 버그 — `lastTouchEndAt` 게이트 (500ms)
- 1명 참가자 결과 히트맵 범례에 동일 카운트 "1"이 두 색으로 두 번 표시 (`getStepLabels`의 step 1과 step 5 중복) — 각 step 상한을 `total - 1`로 cap
- "이벤트 수정" 모달 PATCH 성공 후 재오픈 시 "수정 중..."에서 멈춰 더 이상 수정 불가 — 성공 경로에 `setSubmitting(false)` 추가
- `Multiple GoTrueClient instances detected` 콘솔 경고 — `createBrowserClient()`에 모듈 레벨 싱글톤 캐시
- `MobileBottomBar`의 `backdrop-blur-md` containing block 때문에 모바일 캘린더 가져오기 모달이 바텀바 안에 갇히던 버그 — `ConfirmModal`을 `createPortal`로 `document.body`에 렌더

### Migration

- `npx supabase db push`로 010 마이그레이션 적용 필요. 008은 USING 절 서브쿼리로 실패해 `migration repair --status applied`로 마킹만 됐던 상태였으므로, 010이 실제 ALTER TABLE을 수행함

## [0.4.0] - 2026-05-06

### Added

- `useAuthUser` 훅 + `HeaderDashboardLink` 컴포넌트 — Header 서버 컴포넌트의 사용자 의존성 제거
- `ParticipantFilter.previewSlot` imperative API — 호버 슬롯 응답자 미리보기 (ref 기반)
- `ToggleSwitch` 추출 — 마운트 전 transition 끄기로 첫 렌더 점프 제거
- harness PreToolUse 훅 (`pre-bash-block-destructive-git`, `pre-edit-block-large-delete`) — 위험 git 명령 + 100줄 초과 단일 삭제 차단

### Changed

- 헤더: 비동기 서버 컴포넌트 → 동기. 사용자 상태는 클라이언트 훅에서 처리
- `proxy.ts` 세션 갱신 범위: 전 경로 → `/dashboard`, `/mypage`, `/auth`만 (공개 페이지 round-trip 제거)
- 대시보드 탭 + `SegmentedControl` 인디케이터: ref 측정 → CSS grid + `translateX`
- 결과 히트맵/필터 호버 미리보기: prop drill → ref imperative
- 드래그 그리드: 셀별 `onMouseEnter` → 컨테이너 이벤트 위임 + `contain: paint` + 드래그 중 호버 ring 분리
- 이벤트 페이지 편집 모드: 진입/완료/취소 분리. 취소 버튼(빨강 outline) 추가
- `auth/callback/route.ts`: localhost는 자기 origin, 그 외만 `NEXT_PUBLIC_SITE_URL` (host header injection 방지하면서 로컬 개발 깨지지 않게)

### Fixed

- 시간대 호버 popover 회귀 — view 모드 `HeatmapGrid` `onCellHover`에서 `setHoveredSlot`/`setHoverRect` 누락으로 popover 미표시 (#6)
- 드래그 중 cell 호버 outline 깜빡임

### Security

- `.env.example`에 commit돼 있던 실제 secret 제거 후 placeholder로 정리. **공개 리포(GitHub)에 노출됐던 키는 별도 회전 필요**: Supabase service_role / anon key, COOKIE_SECRET.
- Supabase 신규 API 키 시스템(`sb_publishable_` / `sb_secret_`)으로 마이그레이션. 환경변수 이름 변경:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY`
  - 영향 파일: `src/lib/supabase/{client,server,auth-client,auth-server}.ts`, `src/proxy.ts`, `src/app/auth/callback/route.ts`
  - 배포 시 Vercel/로컬 env 양쪽에 새 이름으로 값 설정 후 재배포 필요 (`NEXT_PUBLIC_*`은 빌드 타임 substitution).

## [0.3.0] - 2026-04-24

### Added

- `InlineDeleteButton` — 휴지통 + 삭제/취소 confirm UX 재사용 컴포넌트 (대시보드/메인 통합)
- `HoverInfoPopover` — 앵커 위 표시되는 호버 popover (Portal + framer-motion)
- 결과 히트맵 cell 호버 시 시간대별 가능/불가/필요하다면 인원 + 이름 popover 표시 (#6)
- 요일 선택 모드 드래그 선택/해제 (캘린더 모드와 동일 패턴) (#3)
- '필요하다면..' 영역에 timeful 스타일 설명 문구 — 편집 가이드 부연 + 범례 subtext (#8)

### Changed

- 메인 페이지 \"최근 이벤트\" → \"최근 기록\" 라벨
- 메인 페이지 X 버튼 → 대시보드와 동일한 휴지통 + confirm UX로 통일
- 이벤트 생성 모달 비밀번호 추가 버튼: 가시성이 낮던 텍스트 링크 → outline pill 버튼 (활성 시 빨강) (#1)
- 요일 픽커 토/일 색상 dim 제거 — 평일과 동일 가독성 (#2)
- 버전 관리 일원화: `docs/VERSION` 제거 → `package.json`의 `version` 필드가 단일 source of truth, SemVer 정상화
- `middleware.ts` → `proxy.ts` (Next.js 16 deprecation 해소)

### Fixed

- 저장 중 그리드 입력 차단 — 저장 진행 중 드래그가 React state를 오염시켜 다음 편집/저장에 의도치 않게 반영되던 문제 (#10)
- 요일 모드 그리드 렌더링 깨짐 — `formatDateCompact`/`formatDateHeader`가 'mon' 같은 키를 Date로 파싱하면서 NaN을 반환하던 문제, 헤더와 dateRange 양쪽 분기 추가 (#4)
- 안 되는 시간(unavailable) 모드 결과 히트맵이 비어보이던 문제 — 모든 카운트 로직(HeatmapGrid/CalendarHeatmapGrid/ResultsPageClient/EventPageClient bestSlots)이 val=0을 집계하지 않아 결과/베스트 타임이 비어있던 문제, eventMode 분기로 'val !== 0'을 가능 카운트로 사용 (#5)
- 비-소유자에게 노출되던 '이벤트 수정' 링크가 PATCH 시 403 → `event.is_owner` 일 때만 노출 (#7)
- 로그인 후 메인으로 복귀해도 비로그인 UI가 그대로 보이던 문제 — `onAuthStateChange`에서 `router.refresh()` 호출하여 서버 컴포넌트 재렌더 (#9)
- 모바일 그리드가 우측으로 치우쳐 보이던 문제 — `flex justify-center` + `w-full` 조합을 block + `mx-auto` 방식으로 변경 (#11)

## [0.2.2.0] - 2026-04-06

### Changed
- 시간 선택기를 shadcn/ui 패턴 Select 컴포넌트로 교체 (열림/닫힘 애니메이션, 자체 스크롤바, Portal 렌더링)
- UI 컴포넌트 라이브러리 기반을 shadcn/ui 패턴으로 전환 (cn 유틸리티, forwardRef, Radix 기반)
- 프로젝트 컨벤션 문서에 shadcn 패턴 작성 규칙 추가

## [0.2.1.0] - 2026-04-06

### Added
- 익명 모드 다중 세션: 한 브라우저에서 여러 이름으로 참여 가능, 기존 참가자 이름 재진입 시 시간표 수정
- 이름 입력 시 기존 응답자 자동 감지 + "수정하기" 버튼 전환
- 요일 모드 이벤트 생성 지원 (월~일 요일 기반 일정 조율)
- 모바일 하단 고정 바 (응답자 목록 + 편집/결과 전환)
- 이벤트 주인 응답자 삭제 기능 (확인 모달 포함)
- 날짜 불연속 시 히트맵 그리드 시각적 구분선 (6px 간격)

### Changed
- 히트맵/편집 셀 높이 32px → 15px (시간 슬롯 모드 정보 밀도 개선)
- 배경 애니메이션: blur+transform blob → 정적 CSS gradient (카카오톡 인앱 브라우저/모바일 호환)
- 캘린더 날짜 선택: 사각형 영역 드래그 → 자유 드래그 (개별 셀 토글)
- 로그인 리다이렉트: 항상 /dashboard → 원래 페이지로 복귀

### Fixed
- 드래그 중 마우스 휠 스크롤 시 드래그 끊김 (window-level 이벤트로 변경)
- 드래그 시 파란색 텍스트 셀렉션 방지 (user-select: none)
- 모바일 이벤트 페이지 키보드 자동 올라옴 (autoFocus 제거)
- 모바일 히트맵 가로 짤림 (overflow-x: auto)
- 모바일 캘린더 터치 드래그 미지원 (touch events + touch-action: none)
- is_owner 권한 로직: 비밀번호 인증 참가자가 주인으로 처리되던 버그

## [0.2.0.1] - 2026-04-06

### Added
- ECC (everything-claude-code) 글로벌 설치 + 프로젝트 전용 2-tier 룰 체계
- 컴포넌트 관계 맵 (.claude/rules/whenmeets-component-map.md)
- 프로젝트 컨벤션 룰 (.claude/rules/whenmeets-conventions.md)
- 커밋 전 검증 파이프라인 (.claude/commands/verify.md)
- PostToolUse tsc 자동 체크 훅 (.claude/settings.json)
- README.md 전체 개발 프로세스 문서화

### Changed
- CLAUDE.md: ECC 글로벌 + 프로젝트 로컬 2-tier 구조로 재편
- Next.js 버전 경고 및 룰 자동 유지 가이드 추가

### Removed
- AGENTS.md (CLAUDE.md에 머지)
- TODOS.md (GitHub Issues로 대체)
- docs/superpowers/plans/ (완료된 과거 구현 플랜)

## [0.2.0.0] - 2026-04-05

### Added
- Google OAuth 로그인 + 비로그인 이름+비밀번호 듀얼 인증 시스템
- 대시보드: 내가 만든/참여한 이벤트 목록 (탭 전환, 슬라이드 인디케이터)
- DESIGN.md 기반 디자인 시스템 전면 적용 (Pretendard, 에메랄드 테마, mesh gradient)
- 15분 단위 슬롯 선택 (기존 30분에서 변경)
- 이벤트 설명 필드 추가/수정 기능
- 이벤트 수정 모달 (제목, 날짜, 시간, 설명 편집)
- 캘린더/요일 토글 SegmentedControl 슬라이드 UI
- 편집 모드 사이드바 응답자 목록 + 호버 링 (이동 중 검은색, 멈추면 에메랄드)
- 편집 그리드 overlay 점선 테두리 + 사이드바 호버 연동
- 히트맵 응답 수 항상 표시 + hover scale 애니메이션
- 이벤트 기록 localStorage 저장 + 랜딩 최근 이벤트 카드
- 커스텀 확인 모달 (alert() 대체)
- 시간 스크롤뷰 마우스 드래그 스크롤
- AdBanner 컴포넌트 (Google AdSense 준비)
- Google Calendar ICS 가져오기 버튼
- 소프트 삭제 (deleted_at) + 이벤트 소유자만 삭제 가능
- W 레터마크 SVG 로고
- 프로필 드롭다운 메뉴 + 로그아웃
- framer-motion 애니메이션 전면 적용 (모달, 드롭다운, 토글, 카드)

### Changed
- 인증 구조: 토큰 기반 → 이름+비밀번호 기반으로 전환
- 브랜드 컬러: 인디고 → 에메랄드 전면 교체
- 그리드 셀 높이: 15px → 24px → 32px (가독성 향상)
- 이벤트 페이지: 모놀리스 → EventPageClient/GridEditor/NameForm 컴포넌트 분리
- 결과 페이지: 컴포넌트 분리 (ResultsPageClient, CalendarHeatmapGrid)
- 드래그 성능: 드래그 중 DOM 직접 페인팅, 종료 시 React 업데이트
- 히트맵 7일 페이징 + 모바일 반응형 그리드
- 편집 완료 시에만 저장 (중간 저장 제거)

### Fixed
- SSR 500 에러 수정 (localStorage 서버사이드 접근 차단)
- 모바일 그리드 좌측 컬럼 잘림 (가로 스크롤 추가)
- 모바일 헤더 버튼 텍스트 줄바꿈 방지
- 모달 backdrop 드래그 후 닫힘 방지 (클릭만 닫기)
- SegmentedControl 패딩/크기 정확한 계산 (offsetLeft 기반)
- 이벤트 모달 높이 90vh 고정 (스크롤바 방지)
- 히트맵 에메랄드 호버 outline 복구
- 편집 완료 후 이벤트 데이터 새로고침
- LIKE 인젝션 방지 (사용자 이름 이스케이프)
- PATCH API 인증 추가 (소유자만 이벤트 수정 가능)
- mode 값 검증 추가 (available/unavailable만 허용)

### Security
- PATCH /api/events/[id] 소유자 인증 추가
- 참여자 이름 LIKE 패턴 이스케이프 (SQL 와일드카드 방지)

## [0.1.0.0] - 2026-04-04

### Added
- Create group scheduling events with title, dates, and time range
- Calendar-style date picker with multi-select
- Touch and mouse drag grid for marking availability (Available / If Needed / Unavailable)
- Password protection for private events with cookie-based auth
- Results heatmap showing group availability with color intensity
- Participant filtering on results page
- Auto-save with 500ms debounce and sendBeacon on tab close
- Realtime updates via Supabase subscriptions
- Share link with clipboard copy
- Mobile-first responsive design
- Korean language interface

### Fixed
- DatePicker buttons no longer trigger parent form submission
- Dragging on already-selected cells now correctly toggles them off
- Timezone-safe date handling prevents off-by-one day shifts
- sendBeacon auth token now sent in request body for compatibility
