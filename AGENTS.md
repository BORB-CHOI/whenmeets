# DayMeet

## Codex entry point

작업 시작 시 `CLAUDE.md`, `.claude/rules/whenmeets-conventions.md`, `.claude/rules/whenmeets-component-map.md`를 읽고 준수한다. 세 파일은 Claude와 Codex의 공유 원본이며 복사본을 만들지 않는다. 프로젝트 규칙은 전역 규칙보다 우선한다.

전환·GA4·Clarity·ChatGPT Ads·유입·리텐션·계측 성능 작업은 `CLAUDE.md`의 Measurement context, `docs/conversion-measurement.md`, `docs/measurement-data-dictionary.md`를 먼저 읽는다.

- 검증: `npm run verify`. 상세 절차는 `.claude/commands/verify.md`, Codex 스킬은 `$whenmeets-verify` (`.agents/skills/whenmeets-verify/SKILL.md`).
- Codex 훅: `.codex/hooks.json` → `scripts/codex-hook.mjs` → 기존 `.claude/scripts/hooks/` 가드. Claude 설정은 Codex가 자동 로드하지 않는다.
- `.codex` 프로젝트 설정을 신뢰한 로컬 Codex에서 `/hooks`로 새 훅을 검토하고 신뢰한 뒤 사용한다. 훅 신뢰를 자동으로 기록하거나 우회하지 않는다. 상세 설정과 지원 범위는 `docs/agent-harness.md`.
- 훅이 실행되지 않는 환경에서도 아래 가드를 수동으로 지킨다: 파괴적 Git 명령 금지, main 직접 커밋/푸시 금지, 프로덕션 DB 변경은 사람 전용, 한 편집에서 100줄 초과 순삭제 금지, 다크 클래스와 코드 주석 신규 추가 금지. TypeScript 편집 묶음 후 `npm run typecheck`를 실행한다.
- Claude와 Codex가 동시에 작업할 때 각자 별도 브랜치와 워크트리를 사용한다. 같은 작업 폴더의 파일과 Git index를 동시에 변경하지 않는다.

## Skill routing

When a request matches an available skill, load it before implementation. Use the Skill tool when available; otherwise read its SKILL.md and follow it.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Coding Rules (2-tier)

### Global (ECC — `~/.codex/rules/`)

Codex는 임의의 rules 폴더를 자동으로 읽지 않는다. 해당 전역 룰이 설치되어 있으면 작업에 맞는 파일을 명시적으로 읽는다:

- `common/` — coding-style, code-review, patterns, performance, security, testing
- `typescript/` — coding-style, patterns, security, testing, hooks
- `web/` — coding-style, design-quality, patterns, performance, security, testing, hooks

### Project-local (`.claude/rules/`) — whenmeets 전용, 글로벌보다 우선

- **whenmeets-component-map.md** — 컴포넌트 간 관계 맵. 한 컴포넌트 수정 시 관련 컴포넌트 반드시 확인/수정.
- **whenmeets-conventions.md** — shadcn/ui 패턴 필수, 하드코딩 금지, Pretendard only, 애니메이션 필수, 자체 스크롤바, 레이아웃 시프트 금지, 한국어 커밋.

## Commands

Claude의 slash command는 Codex에 자동 등록되지 않는다. 설치된 대응 스킬이 있으면 사용하고, 없으면 해당 워크플로 문서를 읽는다. 기존 커맨드: `/build-fix`, `/code-review`, `/tdd`, `/plan`, `/verify`, `/e2e`, `/test-coverage`, `/refactor-clean`

프로젝트 로컬 커맨드:

- `/verify` — 커밋 전 전체 검증 파이프라인 + 컴포넌트 관계성 체크 (글로벌 verify를 오버라이드)

## Next.js Version Warning

This project uses Next.js 16+ with breaking changes. APIs, conventions, and file structure
may differ from training data. Read `node_modules/next/dist/docs/` before writing unfamiliar
Next.js code. Heed deprecation notices.

## Rule Maintenance

Rules in `.claude/rules/` MUST stay in sync with the actual codebase. When you:

- **Add a new component** → update `whenmeets-component-map.md` (add to the correct group, map relationships)
- **Add a new API route** → update `whenmeets-component-map.md` API ↔ Component Mapping table
- **Add a new shared constant** → update `whenmeets-conventions.md` Shared Constants section
- **Rename or delete a component/file** → update `whenmeets-component-map.md` (remove stale paths)
- **Add a new page/feature area** → add a new relationship group in `whenmeets-component-map.md`

After any structural change (new file, renamed file, deleted file, moved file),
verify that `whenmeets-component-map.md` still reflects reality. If it doesn't, fix it before committing.

## Dark mode disabled

다크 모드는 프로젝트 전체에서 **비활성**이며 새 코드에 다크 모드 흔적을 절대 추가하지 말 것.

- `src/app/layout.tsx`: `ThemeProvider forcedTheme="light"`
- `src/app/globals.css`: `@custom-variant dark (&:where(.__dark_disabled_never_match__));` — Tailwind의 `dark:` 변형이 영구적으로 매칭되지 않게 재정의됨
- `.claude/scripts/hooks/pre-edit-block-dark-class.js` + `.claude/settings.json` PreToolUse hook — Edit/Write가 `dark:` Tailwind 클래스를 추가하려 하면 자동으로 차단됨

새 코드 작성/기존 코드 수정 시:
- `dark:*` Tailwind 변형 클래스 0건 (hook이 막음)
- `<html className="dark">`, `useTheme`, `prefers-color-scheme` 미디어 쿼리 신규 작성 금지
- 기존 파일에 남아 있는 `dark:` 클래스를 같은 hunk에서 수정한다면 그 hunk 안에서 제거
- 다크 모드 복귀 PR이 별도 진행되기 전까지 이 상태 유지

## Design System

DESIGN.md는 현재 없음 (코드와 불일치하여 삭제됨).
디자인 판단 시 실제 코드의 기존 패턴을 따를 것. 새로운 디자인 방향이 필요하면 사용자에게 확인.

## Branch workflow

Never commit directly to main. When starting any new task (feature, bugfix, refactor):
1. Check the current branch with `git branch --show-current`
2. If on main, create a feature branch BEFORE making any changes: `git checkout -b feat/<task-name>` or `fix/<task-name>`
3. All work happens on the feature branch
4. Use `/ship` to create a PR back to main

## Database migrations

- 마이그레이션 파일: `supabase/migrations/NNN_*.sql` (3자리 prefix, 순차).
- Prod 적용: 머지 후 `npx supabase db push`를 **사람이 수동 실행**해야 적용됨. Vercel 자동 배포는 코드만 처리.
- **GitHub Actions 가드** (`.github/workflows/check-migrations.yml`): PR/머지 시점에 `scripts/check-pending-migrations.mjs`가 Supabase Management API로 prod 적용 상태를 조회. 적용 안 된 마이그레이션이 있으면 check fail → branch protection으로 머지 차단. GitHub Secret `SUPABASE_ACCESS_TOKEN` 필요 (project ref는 workflow YAML에 하드코딩). Vercel env엔 PAT 안 줌 (인증 스코프 최소화).
- **PR 스코프 규칙**: 마이그레이션이 포함되는 PR은 **그 마이그레이션을 직접 사용하는 코드 변경만** 포함. 다른 기능/픽스와 묶지 말 것 (drive-by migration 금지). 사고 추적이 깨짐.
- 머지 직후 워크플로:
  1. `npx supabase db push --dry-run`로 적용 대상 확인
  2. `npx supabase db push`로 prod 적용
  3. Vercel 재배포 트리거 (또는 다음 푸시까지 대기)

## Versioning

- **Source of truth**: `package.json`의 `version` 필드. SemVer (MAJOR.MINOR.PATCH).
- 별도 `VERSION` 파일은 **두지 않음** — package.json과의 drift 방지.
- 버전 변경: `npm version patch|minor|major` 사용 (자동으로 git tag 생성).
- 릴리즈 시:
  1. `docs/CHANGELOG.md`의 `## [Unreleased]` 섹션을 `## [x.y.z] - YYYY-MM-DD`로 변경
  2. `package.json` 버전 bump
  3. (선택) `docs/v{X.Y.Z}-todos.md` 작업 항목 정리
  4. PR 머지 후 git tag push
- 진행 중 작업은 CHANGELOG에 `## [Unreleased]` 섹션으로 누적 기록.
