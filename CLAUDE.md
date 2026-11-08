# DayMeet

## Shared harness

Codex의 진입점은 `AGENTS.md`이며 이 문서와 `.claude/rules/`를 공유한다. Codex 훅은 `.codex/hooks.json`과 `scripts/codex-hook.mjs`가 기존 가드를 재사용한다. 설정·활성화·동시 작업 절차는 `docs/agent-harness.md`를 따른다.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
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

### Global (ECC — `~/.claude/rules/`)

ECC (everything-claude-code) 글로벌 설치됨. TypeScript, Web, Common 룰이 자동 적용:

- `common/` — coding-style, code-review, patterns, performance, security, testing
- `typescript/` — coding-style, patterns, security, testing, hooks
- `web/` — coding-style, design-quality, patterns, performance, security, testing, hooks

### Project-local (`.claude/rules/`) — whenmeets 전용, 글로벌보다 우선

- **whenmeets-component-map.md** — 컴포넌트 간 관계 맵. 한 컴포넌트 수정 시 관련 컴포넌트 반드시 확인/수정.
- **whenmeets-conventions.md** — shadcn/ui 패턴 필수, 하드코딩 금지, Pretendard only, 애니메이션 필수, 자체 스크롤바, 레이아웃 시프트 금지, 한국어 커밋.

## Commands

ECC 글로벌 커맨드 사용 가능: `/build-fix`, `/code-review`, `/tdd`, `/plan`, `/verify`, `/e2e`, `/test-coverage`, `/refactor-clean`

프로젝트 로컬 커맨드:

- `/verify` — `npm run verify`(타입체크, 린트, 테스트, 컴포넌트 맵 일치 검사)를 통과할 때까지 반복 (글로벌 verify를 오버라이드)

## Verification

- `npm run verify`: `typecheck`, `lint`, `test`, `check:map`, `check:lint-baseline` 을 순서대로 실행. 커밋 전에 통과해야 한다.
- `npm run check:map`: `.claude/rules/whenmeets-component-map.md` 가 코드와 일치하는지 검사 (소스 파일, `src/app` 페이지와 레이아웃, API 라우트, Radix 패키지 목록).
- 린트 기존 위반은 `eslint-suppressions.json` 에 고정돼 있고 새 위반만 실패한다. 위반을 고쳤으면 `npm run lint:prune` 으로 정리한다. 억제 건수는 `origin/main` 보다 늘 수 없고(`check:lint-baseline`), 경고는 `--max-warnings 5` 까지만 허용한다.
- CI (`.github/workflows/ci.yml`): PR 과 main push 마다 위 단계를 실행한다.
- `.ts`/`.tsx` 편집 직후 PostToolUse 훅이 `tsc` 를 돌리고 오류를 에이전트에게 돌려준다 (`.claude/scripts/hooks/post-edit-typecheck.js`, 끄려면 `HARNESS_BYPASS_TYPECHECK=1`).

## Guards

`.claude/settings.json` 의 훅이 위험한 동작을 막는다. 훅 명령은 모두 `$CLAUDE_PROJECT_DIR` 기준 경로라서 작업 디렉터리가 어디든 빠지지 않는다.

- `pre-bash-block-destructive-git`: `git reset --hard`, `git clean -f`, `git push --force` 같은 되돌릴 수 없는 명령. `git -C`, `git -c` 를 끼워도 막는다. 우회: `HARNESS_BYPASS_DESTRUCTIVE=1`
- `pre-bash-block-main-commit`: `main`/`master` 에 직접 커밋, `main`/`master` 로 직접 푸시(`HEAD:main`, `+refspec`, `--all`, `--mirror` 포함). 같은 명령 안의 `cd`, `git -C`, `git checkout main` 도 따라가서 실제로 닿는 브랜치를 기준으로 본다. 우회: `HARNESS_BYPASS_MAIN_COMMIT=1`
- `pre-bash-block-human-only`: `supabase db push`(`--dry-run` 과 `--local` 은 허용), 원격을 가리키는 `db reset --linked`/`--db-url`, 원격 `migration up/down/repair`. 로컬 DB 를 다루는 `db reset` 은 허용한다. 프로덕션 적용은 머지 뒤 사람이 직접 한다. 우회: `HARNESS_BYPASS_HUMAN_ONLY=1`
- `pre-edit-block-large-delete`, `pre-edit-block-dark-class`: 한 번에 100줄 넘게 지우는 편집, `dark:` 클래스 추가.
- `pre-edit-block-new-comments`: `src/`, `scripts/`, `.claude/scripts/` 의 코드 파일(`.ts .tsx .js .jsx .mjs .cjs .css`)에 주석을 늘리는 편집. 편집 전후 주석 본문을 비교해서 편집 전에 없던 주석이 생기면 막는다. 기존 주석을 지우거나 그대로 옮기는 편집은 통과하고, 내용을 바꾸면 새 주석으로 센다. `eslint-disable`, `@ts-expect-error`, `prettier-ignore`, `/// <reference />` 같은 지시어는 세지 않는다. 우회: `HARNESS_BYPASS_COMMENT_BLOCK=1`
- 우회 변수는 Claude Code 를 띄우기 전에 설정해야 한다. 명령 앞에 `VAR=1` 을 붙여도 훅에는 전달되지 않는다.
- `gh pr merge` 는 막지 않는다. 머지는 `main` 룰셋의 필수 검사(`check-migrations`, `verify`)가 지킨다.
- 세 Bash 훅은 명령을 셸처럼 해석한다(`.claude/scripts/hooks/lib/command.js`). 따옴표, 줄 이음, `&&`/`||`/`;`/`|`/`&`, 괄호, heredoc, 주석, `$(...)`, 백틱, `bash -c`, `bash <<EOF`, `eval`, `sudo`/`env`/`xargs`/`timeout` 같은 래퍼를 풀어서 본다. 명령어 자리에 있는 단어만 보므로 `echo git reset --hard` 같은 글자는 막지 않는다.
- 한계: 실수를 막는 장치이고 의도적인 우회까지 막지는 못한다. 파이프로 셸에 넘기는 `echo '...' | bash`, 서브셸 안의 `cd` 범위, 별칭, `git merge`/`cherry-pick` 으로 만드는 로컬 `main` 커밋(푸시는 막힘)은 보지 못한다. 변수로 쓴 푸시 대상(`git push origin $BRANCH`)은 현재 브랜치를 기준으로 판단한다.

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
run `npm run check:map` to verify that `whenmeets-component-map.md` still reflects reality. If it fails, fix the map before committing.

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
