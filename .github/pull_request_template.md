## 변경 요약

<!-- 무엇이 바뀌었고, 왜 바뀌었는지 1~3줄 -->

## 체크리스트

- [ ] 로컬에서 `npm run lint` + `npm test` 통과
- [ ] 새 기능에 시각 회귀 우려가 있으면 8가지 모드(요일/달력 × 가용/불가능 × 시간/날짜) 점검
- [ ] `.claude/rules/whenmeets-component-map.md`가 구조 변경(파일 추가/이름변경/삭제)을 반영
- [ ] `docs/CHANGELOG.md`의 `## [Unreleased]` 섹션에 항목 추가

## 마이그레이션이 포함된 PR인가?

- [ ] 이 PR은 `supabase/migrations/` 아래 새 파일을 추가하지 않음
- [ ] 또는, 마이그레이션 1개 + **그 마이그레이션을 직접 사용하는 코드 변경만** 포함 (drive-by 픽스 금지)
- [ ] 로컬에서 `npx supabase db push --dry-run`으로 적용 대상 확인함
- [ ] 머지 직후 `npx supabase db push`를 prod에 실행할 책임자가 정해져 있음 (Vercel prebuild 가드가 누락 시 빌드를 막지만, 빌드 실패 → 재배포 사이클을 줄이려면 머지 전 push가 안전함)

> 마이그레이션이 기능 PR에 묻혀서 들어가면 추적이 깨집니다. 별도 PR로 가는 것을 권장합니다.

## 테스트 / 검증

<!-- 어떻게 확인했는지, 무엇을 보면 회귀를 잡을 수 있는지 -->
