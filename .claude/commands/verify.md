---
description: 커밋 전 검증 파이프라인. 타입, 린트, 테스트, 컴포넌트 맵 일치를 순서대로 실행하고 통과할 때까지 고친다.
---

# 검증 (/verify)

인자: `$ARGUMENTS`

## 순서

`npm run verify` 한 번으로 다섯 단계를 차례로 실행한다. 앞 단계가 실패하면 뒤 단계는 돌지 않는다.

1. `npm run typecheck`: `tsc --noEmit`
2. `npm run lint`: ESLint. 기존 위반은 `eslint-suppressions.json` 에 고정돼 있고, 새 위반만 실패한다. 경고는 5건까지 허용하며(현재 기준선), 줄였으면 `package.json` 의 `--max-warnings` 값도 같이 낮춘다.
3. `npm run test`: vitest 전체. 수 초에 끝나므로 부분 실행 없이 전부 돌린다.
4. `npm run check:map`: `.claude/rules/whenmeets-component-map.md` 와 코드가 일치하는지 검사한다.
5. `npm run check:lint-baseline`: 린트 억제가 `origin/main` 보다 늘지 않았는지, 경고 상한(`--max-warnings`)이 높아지지 않았는지 확인한다. 억제는 규칙별 합계로 비교하므로 다른 규칙으로 바꿔 덮어도 실패한다. 로컬은 `origin/main` 기준이라 `git fetch origin main` 으로 최신을 받은 뒤 실행한다. CI 는 병합 커밋의 첫 부모와 비교한다.

인자에 `build` 가 있으면 마지막에 `npx next build` 를 foreground 로 실행한다. dev server 는 띄우지 않는다.

## 실패했을 때

- 타입, 테스트 실패: 원인 코드를 고치고 같은 단계부터 다시 돌린다. 테스트를 지우거나 느슨하게 바꿔서 통과시키지 않는다.
- 린트 새 위반: 코드를 고친다. `eslint-suppressions.json` 에 새 위반을 추가하지 않는다.
- 린트 `unused suppressions` 오류: 억제해 둔 위반을 고쳤다는 뜻이다. `npm run lint:prune` 으로 `eslint-suppressions.json` 을 정리하고 같이 커밋한다.
- `check:map` 실패: 메시지가 가리키는 파일을 맵에 추가하거나 맵의 낡은 경로를 고친다.

## 마무리

- 통과할 때까지 반복한다. 중간에 사람에게 넘기지 않는다.
- 보고에는 단계별 통과와 실패, 막혔던 원인만 적는다.
