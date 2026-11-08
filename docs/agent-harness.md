# Claude와 Codex 하네스

두 에이전트가 같은 프로젝트 규칙과 검증기를 사용한다.

| 항목 | Claude Code | Codex |
| --- | --- | --- |
| 진입 문서 | `CLAUDE.md` | `AGENTS.md` |
| 공유 규칙 | `.claude/rules/` | `AGENTS.md` 지시로 같은 파일을 읽음 |
| 검증 | `/verify`, `npm run verify` | `$whenmeets-verify`, `npm run verify` |
| 훅 설정 | `.claude/settings.json` | `.codex/hooks.json` |
| 가드 구현 | `.claude/scripts/hooks/` | `scripts/codex-hook.mjs`가 같은 가드를 호출 |

## Codex 시작

1. 이 저장소를 로컬 Codex에서 연다. Node.js와 의존성(`npm ci`)이 필요하다. 구현 확인 버전은 `codex-cli 0.166.0`이다.
2. 프로젝트 설정을 로드할 수 있도록 프로젝트를 신뢰한다. 새 세션에서 `AGENTS.md`와 저장소 스킬을 읽게 한다.
3. CLI의 `/hooks`에서 `.codex/hooks.json`의 두 훅을 검토하고 신뢰한다. 변경된 훅도 다시 신뢰해야 한다. 신뢰 전에는 훅이 건너뛰어진다. 전역 훅은 프로젝트 훅과 함께 실행되며 대체되지 않는다.
4. `$whenmeets-verify` 또는 “프로젝트 검증해줘”로 검증한다. 터미널에서는 `npm run verify`를 사용한다.

Claude의 Skill 도구와 slash command는 Codex에 자동 이식되지 않는다. 설치된 스킬을 사용하거나 `SKILL.md`를 읽어 수행한다. Codex도 임의의 `.codex/rules/` Markdown 파일을 자동 적용하지 않으므로 `AGENTS.md`에서 공유 규칙을 명시적으로 읽도록 한다.

## 훅 지원 범위

- 셸은 Codex의 정규화된 `Bash` 이벤트를 기존 세 명령 가드에 전달한다. `exec_command`도 이 이벤트로 전달된다.
- `apply_patch`의 여러 파일·추가·수정·삭제·이동을 기존 Edit/Write 입력으로 변환해 대량 삭제, 다크 클래스, 새 주석을 검사한다. 해석할 수 없는 패치는 차단한다.
- 편집 완료 후 변경된 TypeScript 프로젝트마다 타입 검사를 한 번 실행한다.
- 셸이나 별도 MCP 도구로 파일을 쓰는 동작은 편집 가드의 검사 대상이 아니다. 파일 편집은 `apply_patch`를 사용하고 최종 `npm run verify`를 반드시 실행한다. 훅은 모든 도구를 포괄하는 보안 경계가 아니다.
- 훅이 비활성화됐거나 로컬 명령 훅을 지원하지 않는 환경에서는 `AGENTS.md`의 가드를 지키고 타입 검사와 최종 검증을 직접 실행한다. 현재 세션에서 파일을 추가했다고 훅이 즉시 활성화되는 것은 아니다.
- 명령 해석기는 기존 Claude용 구현을 공유한다. 임의의 PowerShell 스크립트나 동적 실행을 완전하게 분석하지 못한다. 위험한 명령을 스크립트·별칭·다른 인터프리터로 감싸 가드를 우회하지 않는다.

Claude와 Codex를 동시에 실행하려면 서로 다른 워크트리를 사용한다. 각 에이전트가 자기 브랜치에서 검증하고 PR로 합친다.

공식 문서: [AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [Skills](https://developers.openai.com/codex/skills), [Hooks와 신뢰 절차](https://learn.chatgpt.com/docs/hooks).
