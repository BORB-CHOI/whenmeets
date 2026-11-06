import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareBaseline,
  compareWarningCap,
  countSuppressions,
  readWarningCap,
} from '../check-lint-baseline.mjs';

const SCRIPT_PATH = fileURLToPath(new URL('../check-lint-baseline.mjs', import.meta.url));

type Suppressions = Record<string, Record<string, { count: number }>>;

const withCounts = (counts: number[]): Suppressions =>
  Object.fromEntries(counts.map((count, i) => [`src/f${i}.ts`, { 'react/rule': { count } }]));

const roots: string[] = [];

const git = (cwd: string, ...args: string[]) =>
  execFileSync(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args],
    { cwd, encoding: 'utf8' },
  );

interface RepoOptions {
  base: Suppressions | null;
  current: Suppressions;
  baseLint?: string;
  currentLint?: string;
}

const packageJson = (lint: string) => JSON.stringify({ scripts: { lint } });

function makeGitRepo({ base, current, baseLint, currentLint }: RepoOptions): string {
  const root = mkdtempSync(join(tmpdir(), 'lint-base-'));
  roots.push(root);
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(join(root, 'README.md'), 'x');
  if (base) writeFileSync(join(root, 'eslint-suppressions.json'), JSON.stringify(base));
  if (baseLint) writeFileSync(join(root, 'package.json'), packageJson(baseLint));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  writeFileSync(join(root, 'eslint-suppressions.json'), JSON.stringify(current));
  if (currentLint) writeFileSync(join(root, 'package.json'), packageJson(currentLint));
  return root;
}

const runCli = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [SCRIPT_PATH, ...args], { cwd: root, encoding: 'utf8' });

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('countSuppressions', () => {
  it('모든 파일과 규칙의 count 를 합친다', () => {
    const suppressions: Suppressions = {
      'a.ts': { r1: { count: 2 }, r2: { count: 3 } },
      'b.ts': { r1: { count: 1 } },
    };

    expect(countSuppressions(suppressions)).toBe(6);
  });

  it('비어 있으면 0 이다', () => {
    expect(countSuppressions({})).toBe(0);
  });
});

describe('compareBaseline', () => {
  it('같으면 통과한다', () => {
    expect(compareBaseline(withCounts([6]), withCounts([6]))).toEqual({
      ok: true,
      base: 6,
      current: 6,
      increased: [],
    });
  });

  it('줄었으면 통과한다', () => {
    expect(compareBaseline(withCounts([6]), withCounts([5])).ok).toBe(true);
  });

  it('늘었으면 실패하고 늘어난 규칙을 알려준다', () => {
    expect(compareBaseline(withCounts([6]), withCounts([7]))).toEqual({
      ok: false,
      base: 6,
      current: 7,
      increased: [{ rule: 'react/rule', base: 6, current: 7 }],
    });
  });

  it('파일 이름이 바뀌어도 규칙별 합계가 같으면 통과한다', () => {
    const renamed: Suppressions = { 'src/renamed.ts': { 'react/rule': { count: 6 } } };

    expect(compareBaseline(withCounts([6]), renamed).ok).toBe(true);
  });

  it('총합이 같아도 다른 규칙의 억제가 늘면 실패한다', () => {
    const base: Suppressions = { 'src/a.ts': { 'react/easy': { count: 10 } } };
    const swapped: Suppressions = { 'src/b.ts': { 'react-hooks/rules-of-hooks': { count: 10 } } };

    const result = compareBaseline(base, swapped);

    expect(result.ok).toBe(false);
    expect(result.increased).toEqual([{ rule: 'react-hooks/rules-of-hooks', base: 0, current: 10 }]);
  });

  it('기준 쪽 파일이 없으면 통과한다', () => {
    expect(compareBaseline(null, withCounts([6]))).toEqual({
      ok: true,
      base: null,
      current: 6,
      increased: [],
    });
  });
});

describe('readWarningCap', () => {
  it.each([
    ['eslint --max-warnings 5', 5],
    ['eslint --max-warnings=3', 3],
    ['eslint --max-warnings 0 src', 0],
  ])('%s 에서 상한 %i 를 읽는다', (lint, expected) => {
    expect(readWarningCap(packageJson(lint))).toBe(expected);
  });

  it('상한이 없으면 무한대로 본다', () => {
    expect(readWarningCap(packageJson('eslint'))).toBe(Infinity);
  });

  it('lint 스크립트가 없어도 무한대로 본다', () => {
    expect(readWarningCap('{}')).toBe(Infinity);
  });
});

describe('compareWarningCap', () => {
  it('같거나 낮으면 통과한다', () => {
    expect(compareWarningCap(5, 5).ok).toBe(true);
    expect(compareWarningCap(5, 3).ok).toBe(true);
  });

  it('높아지면 실패한다', () => {
    expect(compareWarningCap(5, 9).ok).toBe(false);
  });

  it('상한을 없애면 실패한다', () => {
    expect(compareWarningCap(5, Infinity).ok).toBe(false);
  });

  it('기준에 상한이 없으면 통과한다', () => {
    expect(compareWarningCap(Infinity, 5).ok).toBe(true);
  });
});

describe('명령줄 실행', () => {
  it('억제 건수가 기준 브랜치보다 늘면 종료 코드 1 과 건수를 낸다', () => {
    const root = makeGitRepo({ base: withCounts([3]), current: withCounts([4]) });

    const result = runCli(root, 'main');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('3건 → 4건');
  });

  it('총합이 같아도 억제 규칙이 바뀌어 늘면 종료 코드 1 과 규칙 이름을 낸다', () => {
    const swapped: Suppressions = { 'src/f0.ts': { 'react/other': { count: 3 } } };
    const root = makeGitRepo({ base: withCounts([3]), current: swapped });

    const result = runCli(root, 'main');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('react/other');
  });

  it('억제 건수가 같거나 줄면 종료 코드 0 으로 끝난다', () => {
    const same = runCli(makeGitRepo({ base: withCounts([3]), current: withCounts([3]) }), 'main');
    const fewer = runCli(makeGitRepo({ base: withCounts([3]), current: withCounts([2]) }), 'main');

    expect(same.status).toBe(0);
    expect(fewer.status).toBe(0);
  });

  it('기준 브랜치에 억제 파일이 없으면 비교를 건너뛰고 종료 코드 0 으로 끝난다', () => {
    const result = runCli(makeGitRepo({ base: null, current: withCounts([3]) }), 'main');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('건너뜁니다');
  });

  it('기준 브랜치를 찾을 수 없으면 종료 코드 1 로 끝난다', () => {
    const root = makeGitRepo({ base: withCounts([3]), current: withCounts([3]) });

    const result = runCli(root, 'origin/missing');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('origin/missing');
  });

  it('경고 상한이 기준 브랜치보다 높아지면 종료 코드 1 로 끝난다', () => {
    const root = makeGitRepo({
      base: withCounts([3]),
      current: withCounts([3]),
      baseLint: 'eslint --max-warnings 5',
      currentLint: 'eslint --max-warnings 9',
    });

    const result = runCli(root, 'main');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('5 → 9');
  });

  it('경고 상한을 없애면 종료 코드 1 로 끝난다', () => {
    const root = makeGitRepo({
      base: withCounts([3]),
      current: withCounts([3]),
      baseLint: 'eslint --max-warnings 5',
      currentLint: 'eslint',
    });

    const result = runCli(root, 'main');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('상한 없음');
  });

  it('경고 상한이 같으면 종료 코드 0 으로 끝난다', () => {
    const root = makeGitRepo({
      base: withCounts([3]),
      current: withCounts([3]),
      baseLint: 'eslint --max-warnings 5',
      currentLint: 'eslint --max-warnings 5',
    });

    expect(runCli(root, 'main').status).toBe(0);
  });
});
