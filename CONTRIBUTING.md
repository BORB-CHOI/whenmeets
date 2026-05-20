# 기여 가이드

DayMeet 개발 프로세스, 브랜치 규칙, 프로젝트 구조입니다.

## 개발 환경

```bash
npm install
npm run dev        # http://localhost:3000
```

환경 변수는 `.env.example`을 `.env`로 복사해 채웁니다 (Supabase URL/Key, Google OAuth).

## 브랜치 규칙

- `main`에 직접 커밋 금지
- `feat/<name>` 또는 `fix/<name>` 브랜치에서 작업
- 커밋 메시지는 한국어

## 개발 프로세스

### 작업 크기별 플로우

- **소규모** (버그 수정, 스타일 변경): 구현 → `/verify` → `/ship`
- **중규모** (컴포넌트 추가, API 변경): `/plan` → 새 채팅 → 구현 → `/verify` → `/ship`
- **대규모** (새 페이지, 아키텍처 변경): `/plan` → `/autoplan` → 새 채팅 → 구현 → 새 채팅 → `/verify` → `/ship`

### 전체 순서

1. **아이디어** -- `/office-hours` → brainstorming
2. **디자인** -- `/design-consultation` (새 UI 패턴이 필요할 때만)
3. **플랜 작성** -- `/plan` (디자인 결정이 있어야 구체적 플랜 가능)
4. **플랜 리뷰** -- `/autoplan` (대규모만)
5. *새 채팅 (한 세션 = 한 단계 원칙)*
6. **브랜치 생성** -- `git checkout -b feat/<name>`
7. **구현** -- rules 자동 적용
8. *새 채팅 (구현 완료 후)*
9. **검증** -- `/verify`
10. **셀프 리뷰** -- `/code-review`
11. **PR 생성** -- `/ship`
12. **QA** -- `/qa` (필요 시)
13. **디자인 리뷰** -- `/design-review` (구현이 디자인과 맞는지 검증)

### 디자인 가이드

DESIGN.md는 현재 없습니다 (코드와 불일치하여 삭제됨). 디자인 판단 시 실제 코드의 기존 패턴을 따르고, 새로운 디자인 방향이 필요하면 먼저 합의합니다. 자세한 컨벤션은 `.claude/rules/whenmeets-conventions.md` 참고.

### 요구사항이 이미 있을 때

디자인이나 아이디어 단계가 필요 없고, 구체적 요구사항 목록이 있는 경우:

1. **세션 1**: 요구사항을 `/plan`에 붙여넣기 → 우선순위 분류 + 3-4개씩 묶어서 단계별 플랜
2. **세션 2**: 1단계 구현
3. **세션 3**: `/verify` → `/ship`
4. 반복

각 단계가 독립 PR이 되게 묶는 게 핵심. 한 세션에 14개 다 하지 말 것.

### 새 채팅 분기점

| 시점 | 이유 |
|------|------|
| 플랜 완료 후 | 플랜 컨텍스트가 구현 품질을 방해 |
| 구현 완료 후 | 검증/ship은 깨끗한 컨텍스트에서 |
| PR 머지 후 | 다음 기능은 새 세션에서 |
| 주제가 바뀔 때 | 한 세션에 여러 주제 = 품질 급락 |

### 커맨드 요약

| 커맨드 | 언제 | 출처 |
|--------|------|------|
| `/office-hours` | 아이디어 검증 | gstack |
| `/design-consultation` | 새 UI 패턴 디자인 | gstack |
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
    brand/              # 로고 등 브랜드 자산
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
    heatmap.ts          # 히트맵 단계/색상 로직
    supabase/           # Supabase 클라이언트
.claude/
  rules/                # 프로젝트 전용 룰 (컴포넌트 맵, 컨벤션)
  commands/             # 프로젝트 전용 커맨드 (/verify)
  settings.json         # 프로젝트 훅 (tsc 자동 체크)
```
