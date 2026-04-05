# WhenMeets

when2meet 대안 그룹 스케줄링 서비스. Next.js 16 + TypeScript + Supabase.

## 개발 환경

```bash
npm install
npm run dev        # http://localhost:3000
```

환경 변수: `.env` 참고 (Supabase URL/Key, Google OAuth)

## 개발 프로세스

### 작업 크기별 플로우

- **소규모** (버그 수정, 스타일 변경): 구현 → `/verify` → 커밋
- **중규모** (컴포넌트 추가, API 변경): `/plan` → 구현 → `/verify` → `/ship`
- **대규모** (새 페이지, 아키텍처 변경): `/plan` → `/autoplan` → 새 채팅 → 구현 → `/verify` → `/ship`

### 전체 순서

1. **아이디어** -- `/office-hours` → brainstorming
2. **플랜 작성** -- `/plan`
3. **플랜 리뷰** -- `/autoplan` (대규모만)
4. *새 채팅*
5. **브랜치 생성** -- `git checkout -b feat/<name>`
6. **구현** -- rules 자동 적용
7. *컨텍스트 길면: `/checkpoint` → 새 채팅*
8. **검증** -- `/verify`
9. **셀프 리뷰** -- `/code-review`
10. **PR 생성** -- `/ship`
11. **QA** -- `/qa` (필요 시)
12. **디자인 리뷰** -- `/design-review` (필요 시)

### 새 채팅 분기점

| 시점 | 이유 |
|------|------|
| 플랜 리뷰 완료 후 | 리뷰가 컨텍스트를 많이 먹음 |
| `/checkpoint` 후 | 구현 중 컨텍스트 한계 |
| PR 머지 후 | 다음 기능은 깨끗한 컨텍스트에서 |

### 커맨드 요약

| 커맨드 | 언제 | 출처 |
|--------|------|------|
| `/office-hours` | 아이디어 검증 | gstack |
| `/plan` | 구현 계획 작성 | ECC |
| `/autoplan` | 플랜 리뷰 (CEO/디자인/엔지니어링) | gstack |
| `/tdd` | 테스트 먼저 작성 | ECC |
| `/build-fix` | 빌드 에러 수정 | ECC |
| `/investigate` | 버그 원인 추적 | gstack |
| `/checkpoint` | 진행 저장 (긴 작업) | gstack |
| `/verify` | 커밋 전 검증 (tsc/lint/test/build/관계성) | local |
| `/code-review` | 셀프 리뷰 | ECC |
| `/ship` | PR 생성 | gstack |
| `/qa` | 기능 QA + 버그 픽스 | gstack |
| `/design-review` | 비주얼 QA | gstack |
| `/refactor-clean` | 데드코드 정리 | ECC |
| `/test-coverage` | 커버리지 보충 | ECC |
| `/health` | 코드 품질 대시보드 | gstack |
| `/retro` | 주간 회고 | gstack |

### 자동으로 적용되는 것 (신경 안 써도 됨)

- ECC rules (TypeScript, Web, Common) -- 글로벌
- `whenmeets-component-map.md` -- 컴포넌트 수정 시 관련 컴포넌트 강제 확인
- `whenmeets-conventions.md` -- 하드코딩 금지, Pretendard only, 애니메이션 필수
- PostToolUse hook -- 파일 수정 시 tsc 자동 체크

## 프로젝트 구조

```text
src/
  app/                  # Next.js App Router 페이지
    api/events/         # REST API 라우트
    e/[id]/             # 이벤트 참여/결과 페이지
    dashboard/          # 유저 대시보드
  components/
    drag-grid/          # 가용시간 입력 (드래그)
    event-form/         # 이벤트 생성 폼
    event-page/         # 이벤트 참여 페이지
    results/            # 결과 히트맵
    layout/             # 헤더, 푸터
    ui/                 # 공통 UI
    auth/               # 인증 버튼
  hooks/                # 커스텀 훅
  lib/
    constants.ts        # 공유 상수 (색상, 슬롯, 포맷)
    types.ts            # TypeScript 타입
    supabase/           # Supabase 클라이언트
.claude/
  rules/                # 프로젝트 전용 룰 (컴포넌트 맵, 컨벤션)
  commands/             # 프로젝트 전용 커맨드 (/verify)
  settings.json         # 프로젝트 훅 (tsc 자동 체크)
```

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Framer Motion (애니메이션)
- Supabase (DB + Auth + Realtime)
- Vitest (테스트)

## 브랜치 규칙

- `main`에 직접 커밋 금지
- `feat/<name>` 또는 `fix/<name>` 브랜치에서 작업
- 커밋 메시지는 한국어
