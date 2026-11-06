#!/usr/bin/env node

const { commandIndex, parseCommand, programName, readCommand, runHook } = require('./lib/command');

const RUNNERS = new Set(['npx', 'bunx', 'pnpx']);
const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const EXEC_SUBCOMMANDS = new Set(['dlx', 'exec', 'x']);
const RUNNER_VALUE_OPTIONS = new Set(['-p', '--package', '-w', '--workspace', '--prefix', '--cache']);
const SUPABASE = /^supabase(?:@.*)?$/;
const DRY_RUN = /^--dry-run(?:=(?:true|1))?$/;
const LOCAL = /^--local(?:=(?:true|1))?$/;
const REMOTE_TARGET = (flag) => flag === '--linked' || flag.startsWith('--db-url');
const REMOTE_MIGRATION_ACTIONS = ['up', 'down', 'repair'];

function packageStart(words, start) {
  const first = programName(words[start]);
  if (RUNNERS.has(first)) return start + 1;
  if (!PACKAGE_MANAGERS.has(first)) return start;
  const exec = words.findIndex((word, i) => i > start && EXEC_SUBCOMMANDS.has(word));
  return exec === -1 ? start : exec + 1;
}

function supabaseArgs(words) {
  const start = commandIndex(words);
  if (start === -1) return null;

  let index = packageStart(words, start);
  while (index < words.length && words[index].startsWith('-')) {
    index += RUNNER_VALUE_OPTIONS.has(words[index]) ? 2 : 1;
  }

  return SUPABASE.test(programName(words[index] ?? '')) ? words.slice(index + 1) : null;
}

function hasPair(positional, first, second) {
  return positional.some((word, i) => word === first && positional[i + 1] === second);
}

function reasonsFor(args) {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  const flags = args.filter((arg) => arg.startsWith('-'));
  const reasons = [];

  const dryRun = flags.some((flag) => DRY_RUN.test(flag));
  const local = flags.some((flag) => LOCAL.test(flag));
  const remote = flags.some(REMOTE_TARGET);

  if (hasPair(positional, 'db', 'push') && !dryRun && !local) {
    reasons.push('supabase db push 는 프로덕션 DB 에 마이그레이션을 적용한다');
  }
  if (hasPair(positional, 'db', 'reset') && remote) {
    reasons.push('supabase db reset --linked 는 원격 DB 를 초기화한다');
  }
  if (remote && REMOTE_MIGRATION_ACTIONS.some((action) => hasPair(positional, 'migration', action))) {
    reasons.push('supabase migration 은 원격 DB 의 마이그레이션 기록을 바꾼다');
  }
  return reasons;
}

function findViolations(command) {
  return parseCommand(command).flatMap((words) => {
    const args = supabaseArgs(words);
    return args ? reasonsFor(args) : [];
  });
}

function main(raw) {
  if (process.env.HARNESS_BYPASS_HUMAN_ONLY === '1') return 0;

  const command = readCommand(raw);
  const reasons = findViolations(command);
  if (reasons.length === 0) return 0;

  const lines = [
    '[harness] 차단: 사람이 직접 실행하기로 한 명령입니다.',
    `         명령: ${command.trim().split('\n')[0].slice(0, 200)}`,
    ...reasons.map((reason) => `         사유: ${reason}`),
    '         프로덕션 적용은 머지 뒤 사람이 직접 한다 (CLAUDE.md 의 Database migrations 절).',
    '         적용 대상만 확인하려면 --dry-run, 로컬 DB 는 --local 을 쓰세요.',
    '         꼭 필요하면 Claude Code 를 띄우기 전에 HARNESS_BYPASS_HUMAN_ONLY=1 을 설정하세요.',
  ];
  process.stderr.write(`${lines.join('\n')}\n`);
  return 2;
}

if (require.main === module) {
  runHook(main);
}

module.exports = { findViolations, main };
