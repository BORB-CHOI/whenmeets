# Design System — WhenMeets

## Product Context
- **What this is:** 무료 그룹 일정 조율 서비스 (when2meet의 현대적 대안)
- **Who it's for:** 한국 사용자 (학생, 직장인, 스터디 그룹 등)
- **Space/industry:** Scheduling / Productivity (peers: timeful.app, when2meet, Doodle)
- **Project type:** Web app (responsive: mobile, tablet, desktop)
- **Visual reference:** timeful.app의 구조와 UX 90% 참고, 컬러/폰트로 차별화

## Aesthetic Direction
- **Direction:** Brutally Minimal — 타이포그래피와 여백으로 말하는 디자인
- **Decoration level:** Minimal — 그림자와 보더만으로 레이어 구분
- **Mood:** 전문적이면서 현대적. 깨끗하고 신뢰감 있는 일정 도구.
- **Landing page:** Mesh Gradient Flow 배경 (Indigo/Violet 유기적 블롭 애니메이션)
- **Reference sites:** https://timeful.app

## Typography
- **Display/Hero:** Pretendard Variable (800, 48px desktop / 32px mobile)
- **Body:** Pretendard Variable (400, 16px) — 한국어 최적화, Inter 대체
- **UI/Labels:** Pretendard Variable (500-600, 13-14px)
- **Data/Tables:** Geist Mono (tabular-nums, 14px) — 시간 데이터 전용
- **Code:** Geist Mono
- **Loading:** CDN `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- **Scale:**
  - xs: 11px (labels, hints)
  - sm: 13px (small text, meta)
  - base: 16px (body)
  - lg: 18px (large body)
  - xl: 20px (section headers)
  - 2xl: 24px (H2)
  - 3xl: 32px (H1 mobile)
  - 4xl: 48px (H1 desktop, hero)

## Color
- **Approach:** Restrained — Indigo + 뉴트럴 계열
- **Primary:** #4F46E5 (Indigo 600) — 메인 액션, CTA, 링크, 그리드 Available
- **Primary Light:** #818CF8 (Indigo 400) — hover 상태, 보조 강조
- **Primary Pale:** #EEF2FF (Indigo 50) — 배지 배경, 선택된 상태, secondary 버튼
- **Primary Dark:** #3730A3 (Indigo 800) — hover 강조, 텍스트 위 primary
- **Surface:** #FFFFFF — 메인 배경
- **Surface Alt:** #F9FAFB (Gray 50) — 섹션 교대 배경, 입력 필드 비활성
- **Border:** #E5E7EB (Gray 200) — 구분선, 카드 보더
- **Text Primary:** #111827 (Gray 900) — 제목, 본문
- **Text Secondary:** #6B7280 (Gray 500) — 설명, 부가 정보
- **Text Muted:** #9CA3AF (Gray 400) — 힌트, 플레이스홀더, 시간 레이블
- **Semantic:**
  - Success: #059669 (Emerald 600)
  - Warning: #D97706 (Amber 600)
  - Error: #DC2626 (Red 600)
  - Info: #4F46E5 (Primary, Indigo 600)
- **Grid Colors (결과 보기 / viewing mode):**
  - Available: rgba(79, 70, 229, 0.47) — #4F46E577
  - If Needed: #FDE68A (Amber 200)
  - Unavailable: #F3F4F6 (Gray 100) — 아무도 못 오는 시간대, 중립적
- **Grid Colors (편집 중 / editing mode):**
  - Available: rgba(79, 70, 229, 0.47) — #4F46E577 (동일)
  - If Needed: #FDE68A (Amber 200) (동일)
  - Unavailable: rgba(229, 35, 35, 0.15) — #E523230D~26 — 빨간 틴트, "내가 못 감" 표시
- **Dark mode:**
  - Primary shifts to #818CF8
  - Surface: #111827, Surface Alt: #1F2937
  - Border: #374151
  - 채도 10-20% 감소

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Common patterns:**
  - 카드 패딩: 16px
  - 폼 필드 간격: 20-24px
  - 섹션 패딩: 48px (mobile) / 64px (desktop)
  - 헤더 높이: 56px (mobile) / 64px (desktop)
  - 다이얼로그 내부 패딩: 24px (desktop) / 16px (mobile)
  - 그리드 셀 높이: 28px (30분 슬롯)

## Layout
- **Approach:** Grid-disciplined — 엄격한 그리드 정렬
- **Grid:** 1col (mobile) → 2col (tablet, 640px+) → wide (desktop, 1024px+)
- **Max content width:** 1280px (max-w-6xl 상당)
- **Breakpoints:**
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
- **Border radius:**
  - sm: 4px (작은 요소, 배지)
  - md: 6px (버튼, 입력 필드)
  - lg: 8px (카드, 컨테이너)
  - xl: 12px (큰 컨테이너, 다이얼로그)
  - full: 9999px (슬라이드 토글, 아바타)
- **Dialog:** max-width 448px, fullscreen on mobile

## Components

### Buttons
- **Height:** 38px (default), 32px (small)
- **Primary:** bg-primary, text-white, rounded-md, shadow `0px 2px 8px rgba(79,70,229,0.5)`
- **Secondary:** bg-primary-pale, text-primary, rounded-md
- **Ghost:** transparent, text-secondary, border 1px solid border, rounded-md
- **On-Primary:** (mesh gradient 위에서 사용) rgba(255,255,255,0.2) bg, backdrop-blur(8px), border rgba(79,70,229,0.2)
- **Danger:** bg-red-50, text-error, rounded-md
- **Text transform:** none (자연 케이스 유지)

### Form Inputs
- **Border:** 1px solid var(--border)
- **Focus:** border-color primary, box-shadow 0 0 0 3px rgba(79,70,229,0.1), 미세 scale(1.005)
- **Error:** border-color error, box-shadow 0 0 0 3px rgba(220,38,38,0.1)
- **Radius:** md (6px)
- **Padding:** 10px 14px

### Time Range Selector

- **Type:** 드롭다운 셀렉트 (직접 입력 아님)
- **Layout:** `[시작 시간 ▼] ~ [종료 시간 ▼]` 가로 배치
- **Options:** 30분 단위 (12:00 AM, 12:30 AM, ... 11:30 PM), 또는 1시간 단위 간소화
- **Display format:** `9 AM`, `12 PM`, `5:30 PM` (Geist Mono, tabular-nums)
- **Preset 예시:** 드롭다운 상단에 자주 쓰는 범위 표시 (오전 9시~오후 6시, 오후 1시~오후 10시 등)
- **Style:** timeful 스타일 셀렉트. border 1px solid border, radius-md, padding 10px 14px, 드롭다운 화살표 오른쪽
- **Scroll interaction:** 드롭다운이 열린 상태에서 마우스 스크롤/터치 스와이프로 시간 조절 가능. 모바일에서는 iOS 스타일 drum picker(스크롤 휠) UX 권장
- **Focus:** primary border + shadow ring (일반 input과 동일)

### Slide Toggle (timeful style)
- **Container:** pill shape (border-radius 9999px), bg surface-alt, border 1px
- **Indicator:** white pill, border 1px primary, box-shadow, 슬라이드 애니메이션 0.35s cubic-bezier(0.4,0,0.2,1)
- **Active text:** primary color, font-weight 600
- **Inactive text:** text-secondary

### Cards / Event Items
- **Background:** white
- **Border:** 1px solid border
- **Radius:** lg (8px)
- **Shadow:** 0 1px 2px rgba(0,0,0,0.05), hover 시 0 2px 8px rgba(0,0,0,0.08)
- **Min height:** 64px (이벤트 아이템)
- **Hover:** translateY(-2px) + 그림자 강화

### Dialog/Modal
- **Max-width:** 448px
- **Mobile:** fullscreen, bottom-up transition
- **Desktop:** scale-in 0.3s
- **Header padding:** 20px 24px 0
- **Body padding:** 16px 24px
- **Footer padding:** 12px 24px 20px
- **Close button:** 32x32, radius-sm, 투명 배경

### Availability Grid
- **7-day view:** 모바일에서도 7일 표시 (고밀도)
- **Time column:** 32px (mobile) / 48px (desktop)
- **Cell height:** 28px (30분 슬롯)
- **Cell hover:** scale(1.05), z-index 1
- **Cell transition:** background 0.25s ease-in-out
- **Legend:** Available / If needed / Unavailable (영어 라벨)

### Alerts
- **Success:** bg #ECFDF5, text #065F46
- **Warning:** bg #FFFBEB, text #92400E
- **Error:** bg #FEF2F2, text #991B1B
- **Info:** bg primary-pale, text primary-dark
- **Hover:** translateX(4px)

## Motion
- **Approach:** Intentional — 의미 있는 인터랙션에 애니메이션 적용
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1) (기본), ease-out (입장), ease-in (퇴장)
- **Duration:** micro(100ms) short(150-200ms) medium(250-350ms) long(600-800ms)

### Landing Page
- **Mesh Gradient Flow:** 3개 블롭, blur 40-50px, opacity 0.45-0.5
  - 블롭 형태: 유기적 border-radius (40% 60% 55% 45% 등)
  - 애니메이션: 위치 + 회전 + 스케일 + border-radius 동시 변형
  - 주기: 12-18s, ease-in-out, infinite
  - 색상: Indigo 0.45 opacity, Violet 0.5 opacity 그라디언트
- **히어로 입장:** fadeInUp, 순차적 stagger (h1 → p → buttons → note)

### Micro Animations
- **Buttons:** hover translateY(-1px) + 그림자 확대, active translateY(0)
- **Cards:** hover translateY(-2px) + 그림자 강화
- **Inputs:** focus scale(1.005) + indigo ring
- **Grid cells:** hover scale(1.05)
- **Alerts:** hover translateX(4px)
- **Swatches:** hover translateY(-4px)
- **Footer links:** hover translateX(4px)
- **Header links:** 밑줄 scaleX(0 → 1) 애니메이션
- **Theme toggle:** hover scale(1.1) rotate(15deg)

### Scroll Animations
- **IntersectionObserver:** threshold 0.15, rootMargin -40px
- **Entrance:** fadeInUp (opacity 0 → 1, translateY 20px → 0)
- **Duration:** 0.6s ease-out
- **Stagger:** 요소별 50-80ms 시차

## Shadows
- **sm:** 0 1px 2px rgba(0,0,0,0.05) — 카드 기본
- **md:** 0 2px 8px rgba(0,0,0,0.08) — 카드 hover, 다이얼로그
- **btn:** 0px 2px 8px rgba(79,70,229,0.5) — primary 버튼
- **btn-hover:** 0px 4px 12px rgba(79,70,229,0.4) — primary 버튼 hover

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-04 | Indigo Blue #4F46E5 as primary | timeful의 그린과 확실히 다른 색으로 차별화. 캘린더 도구의 전문성 유지. |
| 2026-04-04 | Pretendard as primary font | 한국 시장 타겟. 한국어 최적화 + 모던한 디자인. Inter 대체. |
| 2026-04-04 | 7-day grid density | when2meet의 핵심 UX 유지. timeful의 3일 페이징 대신 고밀도. |
| 2026-04-04 | Mesh Gradient Flow landing | timeful은 정적 화이트. 동적 배경으로 첫인상 차별화. CSS-only, 성능 부담 없음. |
| 2026-04-04 | Slide toggle (not tabs) | timeful 스타일 pill 슬라이드 토글. Dates and times / Dates only 전환. |
| 2026-04-04 | Intentional motion system | 모든 인터랙션에 마이크로 애니메이션. 스크롤 트리거 입장 애니. timeful보다 풍부한 모션. |
| 2026-04-04 | English labels for grid states | Available, If Needed, Unavailable. 나머지 UI는 한국어. |
