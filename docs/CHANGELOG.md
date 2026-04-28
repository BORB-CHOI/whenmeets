# Changelog

All notable changes to WhenMeets will be documented in this file.

> 버전은 [SemVer](https://semver.org/)를 따르며, `package.json`의 `version` 필드가 source of truth.

## [Unreleased]

### Security

- `.env.example`에 commit돼 있던 실제 secret 제거 후 placeholder로 정리. **공개 리포(GitHub)에 노출됐던 키는 별도 회전 필요**: Supabase service_role / anon key, COOKIE_SECRET.

### Changed

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
