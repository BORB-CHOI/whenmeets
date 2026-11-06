import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isEntry } from './lib/is-entry.mjs';

export const SUPPRESSIONS_PATH = 'eslint-suppressions.json';
const PACKAGE_PATH = 'package.json';
const DEFAULT_BASE_REF = 'origin/main';
const MAX_WARNINGS_PATTERN = /--max-warnings(?:=|\s+)(\d+)/;

function ruleTotals(suppressions) {
  const totals = {};
  for (const rules of Object.values(suppressions)) {
    for (const [rule, entry] of Object.entries(rules)) {
      totals[rule] = (totals[rule] ?? 0) + entry.count;
    }
  }
  return totals;
}

export function countSuppressions(suppressions) {
  return Object.values(ruleTotals(suppressions)).reduce((sum, count) => sum + count, 0);
}

export function compareBaseline(baseSuppressions, currentSuppressions) {
  const current = countSuppressions(currentSuppressions);
  if (baseSuppressions === null) return { ok: true, base: null, current, increased: [] };

  const baseTotals = ruleTotals(baseSuppressions);
  const increased = Object.entries(ruleTotals(currentSuppressions))
    .filter(([rule, count]) => count > (baseTotals[rule] ?? 0))
    .map(([rule, count]) => ({ rule, base: baseTotals[rule] ?? 0, current: count }));

  return {
    ok: increased.length === 0,
    base: countSuppressions(baseSuppressions),
    current,
    increased,
  };
}

export function readWarningCap(packageJsonText) {
  const lint = JSON.parse(packageJsonText).scripts?.lint ?? '';
  const match = MAX_WARNINGS_PATTERN.exec(lint);
  return match ? Number(match[1]) : Infinity;
}

export function compareWarningCap(baseCap, currentCap) {
  return { ok: currentCap <= baseCap, base: baseCap, current: currentCap };
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function readAtRef(ref, path, cwd) {
  const listed = git(['ls-tree', '--name-only', ref, '--', path], cwd).trim();
  if (listed === '') return null;
  return git(['show', `${ref}:${path}`], cwd);
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function formatCap(cap) {
  return Number.isFinite(cap) ? String(cap) : '상한 없음';
}

function capOf(packageJsonText) {
  return packageJsonText === null ? Infinity : readWarningCap(packageJsonText);
}

function collectProblems(ref, suppression, cap) {
  const problems = [];
  if (!suppression.ok) {
    problems.push(
      `린트 억제가 기준 브랜치(${ref})보다 늘었습니다. 새 위반은 억제하지 말고 코드를 고치세요.`,
      ...suppression.increased.map((item) => `  - ${item.rule}: ${item.base}건 → ${item.current}건`),
    );
  }
  if (!cap.ok) {
    problems.push(
      `경고 상한이 기준 브랜치(${ref})보다 높아졌습니다: ${formatCap(cap.base)} → ${formatCap(cap.current)}. 경고는 고치고 상한은 내리기만 하세요.`,
    );
  }
  return problems;
}

function main() {
  const ref = process.argv[2] ?? DEFAULT_BASE_REF;
  const cwd = process.cwd();

  let baseSuppressionsText;
  let basePackageText;
  try {
    git(['rev-parse', '--verify', `${ref}^{commit}`], cwd);
    baseSuppressionsText = readAtRef(ref, SUPPRESSIONS_PATH, cwd);
    basePackageText = readAtRef(ref, PACKAGE_PATH, cwd);
  } catch {
    process.stderr.write(`기준 브랜치를 읽지 못했습니다: ${ref}. git fetch 후 다시 실행하세요.\n`);
    process.exitCode = 1;
    return;
  }

  const current = JSON.parse(readFileSync(join(cwd, SUPPRESSIONS_PATH), 'utf8'));
  const suppression = compareBaseline(
    baseSuppressionsText === null ? null : JSON.parse(baseSuppressionsText),
    current,
  );
  const cap = compareWarningCap(
    capOf(basePackageText),
    capOf(readIfExists(join(cwd, PACKAGE_PATH))),
  );

  if (suppression.base === null) {
    process.stdout.write(
      `기준 브랜치(${ref})에 ${SUPPRESSIONS_PATH} 가 없어 억제 건수 비교를 건너뜁니다.\n`,
    );
  }

  const problems = collectProblems(ref, suppression, cap);
  if (problems.length > 0) {
    process.stderr.write(`${problems.join('\n')}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `린트 기준선 유지: 억제 ${suppression.current}건, 경고 상한 ${formatCap(cap.current)}.\n`,
  );
}

if (isEntry(import.meta.url)) {
  main();
}
