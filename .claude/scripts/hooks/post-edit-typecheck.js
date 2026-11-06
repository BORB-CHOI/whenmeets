#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TS_FILE = /\.(ts|tsx|mts|cts)$/;
const MAX_REPORTED_LINES = 30;
const TIMEOUT_MS = 80000;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function findProjectDir(filePath) {
  let dir = path.dirname(path.resolve(filePath));
  for (;;) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function resolveTscBin(projectDir) {
  try {
    return require.resolve('typescript/bin/tsc', { paths: [projectDir] });
  } catch {
    throw new Error(`${projectDir} 에서 typescript 를 찾을 수 없습니다. npm ci 를 먼저 실행하세요.`);
  }
}

function runTypecheck(projectDir) {
  return spawnSync(process.execPath, [resolveTscBin(projectDir), '--noEmit', '--pretty', 'false'], {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function buildReport(output, editedRelPath) {
  const errorLines = output.split('\n').filter((line) => line.includes('error TS'));
  const prefix = `${editedRelPath}(`;
  const own = errorLines.filter((line) => line.startsWith(prefix));
  const others = errorLines.filter((line) => !line.startsWith(prefix));
  const shown = [...own, ...others].slice(0, MAX_REPORTED_LINES);
  const hidden = errorLines.length - shown.length;

  const lines = [
    `[harness] 타입 검사 실패: 오류 ${errorLines.length}건 (방금 편집한 ${editedRelPath} 에서 ${own.length}건).`,
    '         오류를 고친 뒤 다음 작업으로 넘어가세요.',
    ...shown.map((line) => `         ${line}`),
  ];
  if (hidden > 0) lines.push(`         ... 외 ${hidden}건`);
  return lines.join('\n');
}

function tailOf(text) {
  return text.trim().split('\n').slice(-10).join('\n');
}

function describeRunError(error) {
  if (error.code === 'ETIMEDOUT') {
    return `타입 검사가 ${TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다.`;
  }
  return `타입 검사 중 오류가 났습니다: ${error.message}`;
}

function main(raw, run = runTypecheck) {
  if (process.env.HARNESS_BYPASS_TYPECHECK === '1') return 0;

  let input;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    return 0;
  }

  const filePath = input && input.tool_input && input.tool_input.file_path;
  if (typeof filePath !== 'string' || !TS_FILE.test(filePath)) return 0;

  const projectDir = findProjectDir(filePath);
  if (!projectDir) return 0;
  const editedRelPath = toPosix(path.relative(projectDir, path.resolve(filePath)));

  let result;
  try {
    result = run(projectDir);
  } catch (error) {
    process.stderr.write(`[harness] 타입 검사를 실행하지 못했습니다: ${error.message}\n`);
    return 1;
  }

  if (result.error) {
    process.stderr.write(`[harness] ${describeRunError(result.error)}\n`);
    return 1;
  }
  if (result.status === 0) return 0;

  const output = result.stdout || '';
  if (!output.includes('error TS')) {
    const cause = tailOf(result.stderr || output);
    process.stderr.write(
      `[harness] 타입 검사가 비정상 종료했습니다 (종료 코드 ${result.status ?? result.signal}).\n${cause}\n`,
    );
    return 1;
  }

  process.stderr.write(`${buildReport(output, editedRelPath)}\n`);
  return 2;
}

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => process.exit(main(raw)));
}

module.exports = { buildReport, main, TS_FILE, TIMEOUT_MS };
