# Changelog

All notable changes to DayMeet will be documented in this file.

> 버전은 [SemVer](https://semver.org/)를 따르며, `package.json`의 `version` 필드가 source of truth.

## [0.6.5] - 2026-05-22

### Added

- **달력 모드 모바일 셀 탭** — 날짜형 이벤트도 모바일에서 날짜 셀을 탭하면 응답자 상세 시트가 아래에서 올라온다. 기존엔 시간표 모드에서만 가능했다.

### Changed

- **모바일 슬롯 시트 컴포넌트 분리** — 아래에서 올라오는 슬롯 상세 드로어를 `MobileSlotSheet` 컴포넌트로 추출. 시간표 그리드와 달력 그리드가 같은 컴포넌트를 공유한다.
- **달력 그리드 hover 테두리** — 데스크탑 hover 시 실선이던 테두리를 점선으로 통일 (탭 선택 테두리와 일치).

### Fixed

- **If Needed 범례가 안 보이던 문제** — 응답자 목록 아래 `■ if needed` 범례가 스크롤 컨테이너 안에 갇혀 응답자가 많으면 잘려서 안 보였다. 스크롤 바깥으로 빼고, 호버/탭한 슬롯에 if-needed 응답이 있을 때만 표시되도록 수정.
- **모바일 참여자 탭 후 수합 그라데이션이 안 되던 버그** — iOS가 터치 후 synthetic `mouseenter`를 발사해 단독 보기 상태가 계속 고착됐다. `onPointerEnter/Leave` + 마우스 포인터 체크로 교체해 터치에서는 hover 상태를 바꾸지 않도록 수정.
- **응답자 목록이 2개 보이던 문제** — 모바일에서 슬롯 시트가 열려 있을 때 본문 응답자 목록을 숨겨 중복 제거.
- **호버 팝오버가 스크롤을 따라다니던 문제** — `position: fixed` 때문에 스크롤 시 화면에 고정돼 떠다녔다. 페이지 좌표 기반 `absolute`로 바꿔 셀에 붙어 같이 스크롤되도록 수정.
- **편집 그리드 셀의 응답자 수 숫자가 안 보이던 문제** — teal 배경 위에 같은 계열 색 숫자라 묻혔다. 배경 명도에 따라 흰색/어두운색으로 분기 (시간표·달력 그리드 양쪽).
- **달력 편집 모드 모바일 터치 셀 선택 불가** — iOS ghost `mousedown`이 토글을 원복시켰다. 터치 종료 후 500ms 가드 추가.

## [0.6.4] - 2026-05-22

### Changed

- **사이드바 If Needed 표시 개선** — 응답자 목록 호버 시 `*` 회색 텍스트 대신 노랑 사각형(`■`) 인디케이터로 교체. 범례의 If Needed 색상과 동일하여 의미 즉시 연결.

## [0.6.3] - 2026-05-22

### Added

- **Unavailable 범례 설명 문구** — 편집 모드 사이드바에서 Available·If Needed와 동일한 패턴으로 Unavailable 항목에 "참석 불가한 시간" 서브텍스트 추가.

### Fixed

- **날짜 전용 이벤트 "최적 시간만 보기" 전부 사라지는 버그** — `bestSlots`가 숫자 슬롯 키(`mon-36`)를 생성하지만 `CalendarHeatmapGrid`는 `mon-all_day` 키를 사용해 항상 불일치. `event.date_only` 분기 추가로 키 형식 통일.
- **날짜 전용 이벤트 호버 시 참여자 사이드바 오표시** — `getSlotAvailability`에서 `'0'` 슬롯 키로 조회해 전원 0으로 잘못 읽히던 문제. `date_only` 이벤트는 `'all_day'` 키 사용. 사이드바 카운트도 unavailable 모드 분기 추가.

## [0.6.2] - 2026-05-22

### Fixed

- **CalendarDragGrid unavailable 모드 해제 불가 버그** — `handlePointerDown`의 `if (activeMode !== 0)` 가드로 인해 unavailable 모드(`activeMode=0`)에서 erase 결정 로직이 완전히 건너뛰어져, 이미 선택한 안 되는 날짜를 해제할 수 없었던 버그 수정. `erasing.current = availability[date]?.['all_day'] === activeMode`로 단순화.

## [0.6.1] - 2026-05-21

### Changed

- **내부 룰 파일 헤더** — `.claude/rules/whenmeets-component-map.md`, `.claude/rules/whenmeets-conventions.md` H1 제목을 `WhenMeets` → `DayMeet`으로 업데이트 (DayMeet 리브랜딩 마무리)

## [0.6.0] - 2026-05-21

### Added

- **콘텐츠 페이지 풀세트 (AdSense 콘텐츠 가치 입증)** — AdSense 거부 사유 "가치 별로 없는 콘텐츠 + 콘텐츠 없는 화면에 광고"는 도구성 사이트의 구조적 약점. 비공개 이벤트 페이지는 크롤러가 못 봐서 도구 가치가 SEO에 노출되지 않음. 이를 보완하기 위해 다음 4종 신규 라우트 추가. 모두 SSG로 prerender되어 크롤러가 즉시 인덱싱 가능.
  - **`/demo`** — 다섯 명 응답자의 가짜 데이터로 채운 인터랙티브 데모. 결과 히트맵 ↔ 드래그 입력 토글. 입력값은 새로고침 시 사라지는 체험 모드 (저장 X). `HeatmapGrid` / `CalendarHeatmapGrid` / `DragGrid` 기존 컴포넌트 그대로 재사용
  - **`/use-cases`** + **`/use-cases/[slug]`** — 4개 시나리오(결혼식 후 동창회, 추석 가족 모임, 팀 회의, 스터디 그룹) 각각 800~1500자 시나리오 본문 + 데모 임베드 + 핵심 포인트 + CTA. `generateStaticParams`로 4개 슬러그 정적 생성
  - **`/guide`** — 빠른 시작/모드 차이/날짜 전용 모드/결과 해석/비밀번호 + **Timeful · When2meet 비교 표** 10항목. 비교는 정직하게 작성(Google Calendar 동기화는 Timeful 우위로 명시)
- **데모 시드 데이터 모듈** (`src/lib/demo-data.ts`) — DB 안 건드리는 fixture. 4개 use-case + 메인 demo. 응답자 5~8명의 availability를 시간/슬랏 함수로 자연스럽게 생성. `Availability` 타입과 호환되어 모든 그리드 컴포넌트가 그대로 받음
- **데모 viewer 클라이언트 컴포넌트** (`src/components/demo/DemoEventViewer.tsx`) — fixture 받아 결과/편집 모드 토글. `framer-motion` AnimatePresence로 fade transition. `enableEdit` prop으로 편집 모드 비활성화 가능

### Changed

- **`sitemap.ts`** — `/demo` (priority 0.8), `/guide` (0.7), `/use-cases` (0.6), `/use-cases/[slug]` × 4 (0.5) 추가. 빌드 시 use-case 슬러그를 `USE_CASE_SLUGS`에서 자동 enumeration해서 신규 사용 사례 추가 시 sitemap 자동 반영
- **`Footer`** — Links 컬럼을 "둘러보기"로 리네이밍 + 데모/사용 사례/가이드 링크 3개 추가. 수정 hunk 안의 `dark:` 클래스는 룰대로 제거 (다른 hunk의 기존 `dark:`는 별도 PR에서 일괄 처리)
- **DayMeet 리브랜딩** — 제품명 WhenMeets → DayMeet, 도메인 whenmeets.com → daymeet.org. 사용자에게 보이는 브랜드 텍스트 전체 교체 (메타데이터·OG·JsonLd·llms.txt·푸터·약관·가이드 등). GitHub 저장소 경로(`BORB-CHOI/whenmeets`)와 npm 패키지명은 유지.
- **브랜드 컬러 Material Teal → Material Cyan** — `globals.css`의 `@theme` `teal-*` 토큰 10단계를 Material Cyan hex(`#E0F7FA`~`#006064`, primary `#00ACC1`)로 재정의. `teal-*` 유틸 클래스 171곳이 자동 반영되어 클래스명 변경 없음. 테마를 우회하던 하드코딩 hex/rgba(로고 SVG, `heatmap.ts` 스텝 색, `GridCell` 셀 색, `SegmentedControl` glow, 히어로 그라데이션, favicon/apple-icon)도 동일 교체. OG 이미지 Cyan 그라데이션으로 리뉴얼.
- **`NEXT_PUBLIC_SITE_URL` fallback 기본값** — 6개 파일(layout, e/[id]/layout, sitemap, robots, JsonLd, llms.txt)의 fallback을 `https://daymeet.org`로 변경.
- **localStorage/쿠키 네임스페이스** — `whenmeets:*` → `daymeet:*`, 쿠키 `whenmeets_auth_*` → `daymeet_auth_*`, Supabase anon storageKey `whenmeets-anon` → `daymeet-anon`. 기존 사용자는 1회 재로그인 + 익명 이벤트 세션/방문 기록 초기화가 발생.
- **로고 신규 제작** — 기존 "W" 자형(WhenMeets) 마크를 폐기하고 앱의 히트맵 그리드를 형상화한 3×3 셀 마크로 교체. 공용 `Logo` 컴포넌트(`src/components/brand/Logo.tsx`) 하나로 Header·Footer·favicon·apple-icon·OG 이미지 전부 사용 (기존 5곳 SVG 중복 제거). 순수 `<svg>`+`<rect>`라 DOM·Satori 양쪽 호환.

### Removed

- **`/ads.txt` 라우트 핸들러** (`app/ads.txt/route.ts`) — `NEXT_PUBLIC_ADSENSE_CLIENT` 미설정 시 404를 반환하던 동적 라우트를 제거하고 `public/ads.txt` 정적 파일로 교체. env 의존 없이 항상 200 응답 → AdSense ads.txt 크롤러 인식 안정화.
- **`dark:` 클래스 전면 제거** — 비활성 상태로 남아 있던 `dark:` Tailwind 변형 클래스 295건(37파일)을 전부 제거. 라이트 모드 단일 적용을 코드에서도 확정. `globals.css`의 `@custom-variant dark` 무력화 가드는 재유입 방지용으로 유지.
- **`ThemeToggle` 컴포넌트** — 다크 모드 비활성 이후 어디서도 import되지 않던 데드 코드 제거.

### Fixed

- **히트맵 진한 셀 숫자가 배경에 묻히던 버그** — 결과 히트맵에서 응답자가 많을 때(약 7명 이상) 나타나는 4단계 셀은 배경이 `#00ACC1`인데 그 위 카운트 숫자도 같은 cyan 계열이라 안 보였음. 텍스트 색을 셀 배경에서 직접 파생하는 `getCellTextColor()`로 통일 — 가장 진한 5단계만 흰색, 1~4단계는 `#111827`. 주간 그리드·캘린더 그리드·범례가 모두 같은 규칙을 따르도록 정리. Material teal 팔레트 시절부터 있던 기존 버그.

## [0.5.4] - 2026-05-16

### Added

- **마이그레이션 적용 누락 가드 (GitHub Actions)** — `.github/workflows/check-migrations.yml` + `scripts/check-pending-migrations.mjs`. PR/머지 시점에 Supabase Management API로 prod에 적용된 마이그레이션 목록을 가져와, `supabase/migrations/` 로컬 파일 중 prod에 없는 게 있으면 check fail. branch protection으로 머지 차단 가능. v0.5.3 머지 직후 `start_on_monday` 컬럼이 prod DB에 없는 채로 코드만 배포되어 모든 이벤트 생성이 500 응답한 사고의 재발 방지용. GitHub Secret `SUPABASE_ACCESS_TOKEN`만 신규 필요 (project ref는 workflow YAML에 하드코딩, Vercel env엔 PAT 노출 안 함).
- **PR 템플릿** — `.github/pull_request_template.md`. 머지 전 체크리스트, "마이그레이션 별도 PR" 권장, 8가지 모드 회귀 점검 가이드.
- **대시보드 이벤트 카드 2열 레이아웃 (PC)** — 폴더 내 이벤트 카드가 `lg` 이상(≥1024px) 화면에서 2열로 표시. 모바일은 1열 유지. 한 화면에 더 많은 이벤트를 한눈에 보고 관리 가능 (`src/components/dashboard/DashboardClient.tsx`).
- **대시보드 폴더 + 카드 드래그 (명시적 핸들 패턴)** — `@dnd-kit/core` + `@dnd-kit/sortable` 도입. 폴더 헤더와 이벤트 카드 좌측에 **테두리 있는 grip 아이콘 핸들**을 두고, 그 핸들에서만 드래그 시작. 모바일 스크롤과의 충돌이 사라져 long-press 없이 즉시 드래그 가능. PC와 모바일 동작이 일관됨.
- **폴더 순서 변경** — 폴더 헤더 핸들을 잡고 위/아래로 끌어 순서 변경. '폴더 없음' 그룹도 자유롭게 위치 이동 가능. 디바이스 간 동기화 (`PATCH /api/folders/reorder`).
- **폴더 내 카드 순서 변경 + cross-folder 이동** — 카드 핸들을 잡고 같은 폴더 안에서 재정렬하거나 다른 폴더로 이동. multi-container sortable 패턴: dragOver에서 cross-folder 이동을 즉시 반영, dragEnd에서 affected 폴더들의 모든 카드 position을 일괄 저장 (`PATCH /api/events/reorder`). 드래그 중인 카드 자리에는 **dashed teal placeholder**가 표시되어 들어갈 위치가 명시적으로 보임.
- **마이그레이션 015 `no_folder_position`** — `profiles` 테이블에 `no_folder_position INTEGER` 컬럼 추가. '폴더 없음'은 `folders` 테이블에 행이 없는 가상 그룹이라 별도 컬럼이 필요. NULL이면 항상 맨 아래.
- **마이그레이션 016 `user_event_order`** — 사용자별 카드 순서 저장용 새 테이블 `(user_id, event_id, position)`. user_event_folders와 별도 — folder 정보와 무관하게 카드 순서만 보관. 행이 없는 이벤트는 created_at desc fallback.

## [0.5.3] - 2026-05-08

### Added

- 홈 콘텐츠 섹션 3종 (AdSense 정책 대응 + SEO 보강) — 기존 hero가 thin onboarding 화면 단독이라 "콘텐츠 없음/낮음" 정책 위반 후보였음. 다음 추가:
  - **How it works** — 3 step (이벤트 만들기 / 링크 공유 / 시간 고르기). 각 step에 실제 UI를 모방한 mockup 포함 (Step 2는 실제 이벤트 페이지 헤더 + "복사됨!" 상태 + "링크가 복사되었습니다" 토스트 그대로 재현)
  - **Features** — 4 cards: **3초면 이벤트 생성** (단일 모달 vs 타 도구 4~6단계 위저드), 모바일 우선, 실시간 동기화, 무료/오픈소스
  - **FAQ** — 6 Q&A: when2meet 비교(2008년 UI/모바일 드래그/한국어 부재 등), Timeful 비교(비로그인 입력 + 셀별 인원수 숫자 + 안되는 시간 모드 + 횟수 무제한), 카톡 보안 브라우저 오류 대응, 3단계 응답 구분, 응답 비밀번호 보호, 요일 모드. framer-motion accordion
- 이벤트 페이지 OG 이미지 (직전 PR에서 누락) — `/e/[id]/layout.tsx` `generateMetadata`에 `openGraph.images` + Twitter `summary_large_image` 명시. 카톡으로 이벤트 링크 공유 시 brand 이미지 노출
- main/master 직접 commit 차단 PreToolUse hook — `git commit` 명령어가 main 브랜치에서 실행되면 exit 2로 차단 + feature 브랜치 + PR 워크플로 안내. 비상 시 `HARNESS_BYPASS_MAIN_COMMIT=1`로 우회 (`.claude/scripts/hooks/pre-bash-block-main-commit.js`)

### Fixed

- 이벤트 페이지 Google 로그인 버튼이 인앱브라우저 가드 우회 — `EventPageClient.tsx`의 "Google로 계속하기"가 `AuthButton`과 별개로 `signInWithOAuth` 직접 호출. 카톡으로 이벤트 링크 들어와 로그인 시 `disallowed_useragent` 403 그대로 발생. 동일한 `detectInAppBrowser` 가드 + `InAppBrowserModal` 적용
- 그리드 라인 가시성 — 기존 box-shadow inset 방식이 일부 환경에서 transparent overlay 위에 잘 안 보이던 문제. cell wrapper에 직접 border 적용으로 전환해 모든 브라우저에서 확실히 렌더. 색상은 `#d1d5db` → `#999999`로 진하게 (`src/components/availability-grid/AvailabilityGrid.tsx`)
- 히어로 슬로건 "모바일에서도 편하게 쓰는 그룹 일정 조율." 줄바꿈 — `whitespace-nowrap` + 모바일 `text-base sm:text-lg` 분기로 320px에서도 한 줄 보장

### Changed

- AdSense 액션 페이지 광고 비표시 — `/new`, `/mypage`, `/dashboard`는 폼/네비게이션 화면이라 정책상 광고 비허용. `FloatingAds`에서 prefix 매칭으로 모든 광고 숨김 (`src/components/ads/FloatingAds.tsx`)
- 페이지네이션 UX 재설계 (날짜 8개 이상)
  - 기존 우측 단일 컬럼에 prev/next 세로 stack → prev/next 좌우 분리
  - prev 버튼은 시간축 컬럼 헤더 영역 안에 통합 → 첫 날짜 헤더 바로 옆에 밀착
  - 데스크톱에서 `lg:sticky lg:top-16`로 날짜 헤더와 함께 viewport 상단에 고정 (스크롤해도 계속 보임)
  - 전체 가로 budget 92px → 72px로 표 가로폭 +20px 확보
  - 범례 padding(`HeatmapLegend` wrapper)도 페이지네이션 여부에 따라 동적 조정해 그리드 column 영역과 정렬

## [0.5.2] - 2026-05-08

### Added

- 서비스 favicon — `src/app/icon.tsx` (32×32) + `src/app/apple-icon.tsx` (180×180), 헤더 W 로고와 동일한 teal-600 + white 스타일을 `next/og` `ImageResponse`로 동적 생성. Next.js 기본 favicon.ico 제거
- OG/Twitter 공유 이미지 — `src/app/opengraph-image.tsx` (1200×630, Twitter도 re-export). 카카오톡·트위터·페이스북 공유 시 사용자 프로필 사진 대신 brand 이미지 노출. Pretendard 폰트(jsdelivr CDN)로 한국어 텍스트 렌더, teal 그라데이션 + 로고 + 슬로건
- 인앱 브라우저 감지 + 외부 브라우저 안내 — 카카오톡 인앱브라우저에서 Google OAuth `disallowed_useragent` 403 차단 회피. 카톡/네이버/라인/인스타그램/페이스북 UA 감지 후 로그인 클릭 시 모달 표시. 카톡은 `kakaotalk://web/openExternal?url=` 스킴으로 외부 브라우저 자동 열기, 미지원 브라우저는 링크 복사 + 수동 안내 (`src/lib/inAppBrowser.ts`, `src/components/auth/InAppBrowserModal.tsx`, `src/components/auth/AuthButton.tsx`)

### Fixed

- 인앱브라우저 UA 감지 false positive — Naver Whale 브라우저(일반 브라우저)를 인앱으로 잘못 분류하던 문제. Naver 인앱은 `naver(inapp` / `naver/inapp` 패턴으로 강화, Whale 제외

## [0.5.1] - 2026-05-08

### Fixed

- 모든 페이지 가로폭이 PC 모드에서 모바일처럼 좁게 렌더되던 회귀 — `<main>`의 `flex-1 flex flex-col` 중 `flex flex-col`이 자식의 `mx-auto`를 무력화시켜 `max-w-4xl` centering이 깨졌음. sticky footer는 `flex-1`만으로 동작하므로 `flex flex-col` 제거 (`src/app/layout.tsx`)
- 그리드 범례(HeatmapLegend) 왼쪽 여백이 시간 컬럼 폭과 어긋나던 버그 — 시간 컬럼이 44/24px → 20/18px로 줄었는데 범례 패딩 `pl-6 sm:pl-11`이 옛 값 그대로 남아있었음. 시간 컬럼 폭과 동기화 (`src/components/event-page/EventPageClient.tsx`)
- 모바일 그리드 편집 모드에서 시간 라벨/우측 여백 터치 시 페이지 스크롤이 잘 안 되던 UX — 시간 컬럼 18→28px 확장 + 우측 패딩 `pr-3`→`pr-7`로 좌우 대칭 28px hit 영역 확보. 시간 라벨은 `justify-end + pr-1`로 우측 정렬되어 그리드 옆 시각 위치 유지, 좌측 10px가 invisible scroll-pass-through 영역
- 사이드바 "If Needed 숨기기" 토글의 "(1명 단독 시 자동 표시)" 보조 라벨 제거 — toggle disabled 시각 상태(opacity-50, cursor-not-allowed)와 자동 동작이 이미 충분, 텍스트는 시각적 노이즈

### Changed

- `TIME_COL_WIDTH_MOBILE` 18 → 28px (모바일 손가락 hit 영역), `TIME_COL_WIDTH_DESKTOP` 20px 유지. 매직 넘버는 `src/lib/constants.ts`로 추출

### Docs

- `.claude/rules/whenmeets-conventions.md`에 "Global Blast-Radius Changes" 섹션 추가 — 루트 레이아웃·body·main·globals.css 같은 전역 영향 파일 변경 시 최소 변경 원칙, flex/grid/position 추가의 high-risk 인지, 단일 관심사 커밋, 다중 페이지 시각 회귀 검증, dev server는 사용자 터미널에서 실행

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
