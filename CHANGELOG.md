# Changelog

All notable changes to WhenMeets will be documented in this file.

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
