#!/usr/bin/env node

const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');
const { commandIndex, parseCommand, parseGit, readCommand, runHook } = require('./lib/command');

const PROTECTED = new Set(['main', 'master']);
const PUSH_OPTIONS_WITH_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const CREATE_FLAGS = new Set(['-b', '-B', '-c', '-C', '--create', '--force-create']);
const GIT_TIMEOUT_MS = 5000;

function defaultGetBranch(dir, gitArgs = []) {
  try {
    const branch = execFileSync('git', [...gitArgs, 'branch', '--show-current'], {
      cwd: dir || undefined,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: GIT_TIMEOUT_MS,
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function toNativePath(value) {
  if (process.platform !== 'win32') return value;
  const match = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(value);
  return match ? `${match[1].toUpperCase()}:/${match[2] ?? ''}` : value;
}

function resolveDir(base, dirs) {
  return dirs.reduce((cwd, dir) => path.resolve(cwd, toNativePath(dir)), base);
}

function cdTarget(words) {
  const index = commandIndex(words);
  if (index === -1 || !['cd', 'pushd'].includes(words[index])) return null;
  const rest = words.slice(index + 1);
  if (rest[0] === '-') return null;
  const target = rest.find((word) => !word.startsWith('-'));
  return target === undefined ? os.homedir() : target;
}

function switchedBranch(git) {
  if (git.subcommand !== 'checkout' && git.subcommand !== 'switch') return undefined;
  if (git.args.includes('--')) return undefined;
  const create = git.args.findIndex((arg) => CREATE_FLAGS.has(arg));
  if (create !== -1) return git.args[create + 1];
  return git.args.filter((arg) => !arg.startsWith('-'))[0];
}

function splitPushArgs(args) {
  const positional = [];
  let hasRepoOption = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (arg === '--repo' || arg.startsWith('--repo=')) hasRepoOption = true;
      if (PUSH_OPTIONS_WITH_VALUE.has(arg)) i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, hasRepoOption };
}

function destinationViolation(spec, currentBranch) {
  const raw = spec.replace(/^\+/, '');
  let destination = raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw;
  if (/[*$`]/.test(destination)) {
    return [{ kind: 'push', detail: `대상을 알 수 없는 refspec ${spec}` }];
  }
  if (destination === 'HEAD') destination = currentBranch() ?? '';
  destination = destination.replace(/^refs\/heads\//, '');
  return PROTECTED.has(destination) ? [{ kind: 'push', detail: destination }] : [];
}

function checkPush(args, currentBranch) {
  const wide = ['--all', '--mirror'].find((flag) => args.includes(flag));
  if (wide) return [{ kind: 'push', detail: wide }];

  const { positional, hasRepoOption } = splitPushArgs(args);
  const refspecs = hasRepoOption ? positional : positional.slice(1);
  if (refspecs.length === 0) {
    if (args.includes('--tags')) return [];
    const branch = currentBranch();
    return PROTECTED.has(branch) ? [{ kind: 'push', detail: branch }] : [];
  }
  return refspecs.flatMap((spec) => destinationViolation(spec, currentBranch));
}

function findViolations(command, getBranch = defaultGetBranch) {
  const state = { cwd: process.cwd(), branch: null };
  const cache = new Map();
  const lookup = (dir, gitArgs) => {
    const key = [dir, ...gitArgs].join('\u0000');
    if (!cache.has(key)) cache.set(key, getBranch(dir, gitArgs));
    return cache.get(key);
  };
  const violations = [];

  for (const words of parseCommand(command)) {
    const target = cdTarget(words);
    if (target !== null) {
      state.cwd = path.resolve(state.cwd, toNativePath(target));
      state.branch = null;
      continue;
    }

    const git = parseGit(words);
    if (!git) continue;

    const dir = resolveDir(state.cwd, git.dirs);
    const plain = git.dirs.length === 0 && git.gitArgs.length === 0;
    const currentBranch = () => (plain && state.branch ? state.branch : lookup(dir, git.gitArgs));

    if (git.subcommand === 'commit') {
      const branch = currentBranch();
      if (PROTECTED.has(branch)) violations.push({ kind: 'commit', detail: branch });
    } else if (git.subcommand === 'push') {
      violations.push(...checkPush(git.args, currentBranch));
    }

    const switched = switchedBranch(git);
    if (switched !== undefined && plain) state.branch = switched;
  }
  return violations;
}

function describeViolation({ kind, detail }) {
  if (kind === 'commit') {
    return [
      `[harness] 차단: ${detail} 브랜치에는 직접 커밋할 수 없습니다.`,
      '         기능 브랜치를 먼저 만드세요: git checkout -b feat/<작업 이름>  (또는 fix/<작업 이름>)',
      '         커밋한 뒤 PR 로 main 에 합칩니다.',
    ];
  }
  return [
    `[harness] 차단: main/master 로 직접 푸시할 수 없습니다 (${detail}).`,
    '         기능 브랜치를 푸시하고 PR 로 합치세요.',
  ];
}

function main(raw, getBranch = defaultGetBranch) {
  if (process.env.HARNESS_BYPASS_MAIN_COMMIT === '1') return 0;

  const violations = findViolations(readCommand(raw), getBranch);
  if (violations.length === 0) return 0;

  const lines = [
    ...violations.flatMap(describeViolation),
    '         꼭 필요하면 Claude Code 를 띄우기 전에 HARNESS_BYPASS_MAIN_COMMIT=1 을 설정하세요.',
  ];
  process.stderr.write(`${lines.join('\n')}\n`);
  return 2;
}

if (require.main === module) {
  runHook(main);
}

module.exports = { findViolations, main };
