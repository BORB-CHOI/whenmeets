#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  commandIndex,
  isDynamicPath,
  parseCommand,
  parseGit,
  readCommand,
  readCwd,
  resolveDir,
  runHook,
  toNativePath,
} = require('./lib/command');

const PROTECTED = new Set(['main', 'master']);
const PUSH_OPTIONS_WITH_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
const CREATE_FLAGS = new Set(['-b', '-B', '-c', '-C', '--create', '--force-create']);
const DETACHED = '(detached)';
const GIT_TIMEOUT_MS = 5000;

function runGit(dir, gitArgs, args) {
  try {
    return execFileSync('git', [...gitArgs, ...args], {
      cwd: dir || undefined,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: GIT_TIMEOUT_MS,
    }).trim();
  } catch {
    return '';
  }
}

const DEFAULT_ENV = {
  getBranch: (dir, gitArgs = []) => runGit(dir, gitArgs, ['branch', '--show-current']) || null,
  resolveRef: (dir, gitArgs, ref) => runGit(dir, gitArgs, ['rev-parse', '--abbrev-ref', ref]) || null,
};

function normalizeEnv(env) {
  if (typeof env === 'function') return { getBranch: env, resolveRef: () => null };
  return { ...DEFAULT_ENV, ...env };
}

function newState(baseCwd) {
  return { base: baseCwd, cwd: baseCwd, previous: baseCwd, stack: [], branch: null };
}

function moveTo(state, target) {
  state.previous = state.cwd;
  state.cwd = isDynamicPath(target) ? state.base : path.resolve(state.cwd, toNativePath(target));
  state.branch = null;
}

function applyDirectoryChange(state, words) {
  const index = commandIndex(words);
  const program = index === -1 ? '' : words[index];
  if (!['cd', 'pushd', 'popd'].includes(program)) return false;

  const rest = words.slice(index + 1);
  if (program === 'popd') {
    state.cwd = state.stack.pop() ?? state.cwd;
    state.branch = null;
    return true;
  }
  if (rest[0] === '-') {
    const back = state.previous;
    state.previous = state.cwd;
    state.cwd = back;
    state.branch = null;
    return true;
  }
  if (program === 'pushd') state.stack.push(state.cwd);
  const target = rest.find((word) => !word.startsWith('-'));
  moveTo(state, target === undefined ? os.homedir() : target);
  return true;
}

function isRelativeRef(name) {
  return name === '-' || /^@\{-\d*\}$/.test(name);
}

function switchedBranch(git, state, env) {
  if (git.subcommand !== 'checkout' && git.subcommand !== 'switch') return undefined;
  const args = git.args;
  if (args.includes('--')) return undefined;
  if (args.includes('--detach')) return DETACHED;

  const compact = args.map((arg) => /^-[bBcC](.+)$/.exec(arg)).find(Boolean);
  if (compact) return compact[1];
  const create = args.findIndex((arg) => CREATE_FLAGS.has(arg));
  if (create !== -1) return args[create + 1];

  const target = args.filter((arg) => arg === '-' || !arg.startsWith('-'))[0];
  if (target === undefined) return undefined;
  if (isRelativeRef(target)) {
    return env.resolveRef(state.cwd, git.gitArgs, target === '-' ? '@{-1}' : target);
  }
  if (fs.existsSync(path.resolve(state.cwd, toNativePath(target)))) return undefined;
  const tracking = args.includes('--track') || args.includes('-t');
  return tracking && target.includes('/') ? target.slice(target.indexOf('/') + 1) : target;
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
  if (destination.includes('*')) {
    return [{ kind: 'push', detail: `대상을 알 수 없는 refspec ${spec}` }];
  }
  if (destination === 'HEAD' || isDynamicPath(destination)) destination = currentBranch() ?? '';
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

function findViolations(command, envOrGetBranch = DEFAULT_ENV, baseCwd = process.cwd()) {
  const env = normalizeEnv(envOrGetBranch);
  const state = newState(baseCwd);
  const cache = new Map();
  const lookup = (dir, gitArgs) => {
    const key = [dir, ...gitArgs].join('\u0000');
    if (!cache.has(key)) cache.set(key, env.getBranch(dir, gitArgs));
    return cache.get(key);
  };
  const violations = [];

  for (const words of parseCommand(command)) {
    if (applyDirectoryChange(state, words)) continue;

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

    const switched = switchedBranch(git, state, env);
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

function main(raw, env = DEFAULT_ENV) {
  if (process.env.HARNESS_BYPASS_MAIN_COMMIT === '1') return 0;

  const payloadCwd = readCwd(raw);
  const baseCwd = payloadCwd && fs.existsSync(payloadCwd) ? payloadCwd : process.cwd();
  const violations = findViolations(readCommand(raw), env, baseCwd);
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
