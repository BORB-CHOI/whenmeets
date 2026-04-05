# WhenMeets

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
- **whenmeets-conventions.md** — 하드코딩 금지, Pretendard only, 애니메이션 필수, 레이아웃 시프트 금지, 한국어 커밋.

## Commands

ECC 글로벌 커맨드 사용 가능: `/build-fix`, `/code-review`, `/tdd`, `/plan`, `/verify`, `/e2e`, `/test-coverage`, `/refactor-clean`

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

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Branch workflow

Never commit directly to main. When starting any new task (feature, bugfix, refactor):
1. Check the current branch with `git branch --show-current`
2. If on main, create a feature branch BEFORE making any changes: `git checkout -b feat/<task-name>` or `fix/<task-name>`
3. All work happens on the feature branch
4. Use `/ship` to create a PR back to main
