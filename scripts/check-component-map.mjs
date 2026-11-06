import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isEntry } from './lib/is-entry.mjs';

export const MAP_PATH = '.claude/rules/whenmeets-component-map.md';
export const CONVENTIONS_PATH = '.claude/rules/whenmeets-conventions.md';
const SRC_DIR = 'src';
const APP_DIR = 'src/app';
const API_DIR = 'src/app/api';
const FILE_PATH_PATTERN = /\b(?:src|public|supabase|scripts)\/[-\w./[\]()]+\.[A-Za-z0-9]{1,5}\b/g;
const API_PATH_PATTERN = /(?<![\w/])\/api\/[-\w/[\]]*[\w\]]/g;

function isTrackedSource(name) {
  return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== 'index.ts';
}

function isAppEntryFile(name) {
  return name === 'page.tsx' || name === 'layout.tsx' || name === 'route.ts';
}

function listFiles(root, dir, accept, skip = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const found = [];
  const entries = readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && !skip.includes(rel)) {
        found.push(...listFiles(root, rel, accept, skip));
      }
    } else if (accept(entry.name)) {
      found.push(rel);
    }
  }
  return found;
}

function listTrackedFiles(root) {
  const appEntries = listFiles(root, APP_DIR, isAppEntryFile).filter(
    (file) => !file.startsWith(`${API_DIR}/`),
  );
  return [...listFiles(root, SRC_DIR, isTrackedSource, [APP_DIR]), ...appEntries];
}

function listApiRoutes(root) {
  return listFiles(root, API_DIR, (name) => name === 'route.ts').map(
    (file) => `/${file.slice('src/app/'.length, -'/route.ts'.length)}`,
  );
}

function uniqueMatches(text, pattern) {
  return [...new Set(text.match(pattern) ?? [])];
}

function tableRows(text) {
  return text
    .split('\n')
    .filter((line) => line.trimStart().startsWith('|'))
    .join('\n');
}

function findStaleFiles(root, map) {
  return uniqueMatches(map, FILE_PATH_PATTERN)
    .filter((file) => !existsSync(join(root, file)))
    .map((file) => `맵에 적힌 파일이 없음: ${file}`);
}

function findUnmappedFiles(root, rows) {
  const mapped = new Set(uniqueMatches(rows, FILE_PATH_PATTERN));
  return listTrackedFiles(root)
    .filter((file) => !mapped.has(file))
    .map((file) => `맵에 없는 파일: ${file}`);
}

function findRouteProblems(root, map, rows) {
  const actual = new Set(listApiRoutes(root));
  const stale = uniqueMatches(map, API_PATH_PATTERN)
    .filter((route) => !actual.has(route))
    .map((route) => `맵에 적힌 API 라우트 파일이 없음: ${route}`);
  const documented = new Set(uniqueMatches(rows, API_PATH_PATTERN));
  const missing = [...actual]
    .filter((route) => !documented.has(route))
    .map((route) => `맵에 없는 API 라우트: ${route}`);
  return [...stale, ...missing];
}

function findRadixProblems(root, conventions) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    .filter((name) => name.startsWith('@radix-ui/') && !conventions.includes(name))
    .map((name) => `설치된 Radix 패키지가 conventions 에 없음: ${name}`);
}

export function checkComponentMap(root) {
  const map = readFileSync(join(root, MAP_PATH), 'utf8');
  const conventions = readFileSync(join(root, CONVENTIONS_PATH), 'utf8');
  const rows = tableRows(map);

  return [
    ...findStaleFiles(root, map),
    ...findUnmappedFiles(root, rows),
    ...findRouteProblems(root, map, rows),
    ...findRadixProblems(root, conventions),
  ];
}

function main() {
  const problems = checkComponentMap(process.cwd());
  if (problems.length === 0) {
    process.stdout.write('컴포넌트 맵이 코드와 일치합니다.\n');
    return;
  }
  process.stderr.write(`컴포넌트 맵이 코드와 맞지 않습니다 (${problems.length}건).\n`);
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.stderr.write(`${MAP_PATH} 를 고친 뒤 다시 실행하세요.\n`);
  process.exitCode = 1;
}

if (isEntry(import.meta.url)) {
  main();
}
