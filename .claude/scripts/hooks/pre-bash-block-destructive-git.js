#!/usr/bin/env node

const { parseCommand, parseGit, readCommand, runHook } = require('./lib/command');

function hasShort(args, letter) {
  return args.some((arg) => /^-[^-]/.test(arg) && arg.slice(1).includes(letter));
}

function isForce(args) {
  return args.includes('--force') || hasShort(args, 'f');
}

function positionalOf(args) {
  return args.filter((arg) => !arg.startsWith('-'));
}

const RULES = new Map([
  [
    'reset',
    (args) =>
      args.includes('--hard') || args.includes('--keep')
        ? ['git reset --hard/--keep 는 작업 트리의 변경을 버린다']
        : [],
  ],
  [
    'checkout',
    (args) => [
      ...(args.includes('--') ? ['git checkout [<커밋>] -- <경로> 는 파일을 되돌려 변경을 버린다'] : []),
      ...(isForce(args) ? ['git checkout -f 는 작업 트리의 변경을 버린다'] : []),
      ...(args.includes('.') ? ['git checkout . 은 작업 트리의 변경을 모두 버린다'] : []),
    ],
  ],
  [
    'switch',
    (args) =>
      isForce(args) || args.includes('--discard-changes')
        ? ['git switch -f/--discard-changes 는 작업 트리의 변경을 버린다']
        : [],
  ],
  [
    'restore',
    (args) => {
      const staged = args.includes('--staged') || hasShort(args, 'S');
      const worktree = args.includes('--worktree') || hasShort(args, 'W');
      return staged && !worktree ? [] : ['git restore <경로> 는 작업 트리의 변경을 버린다'];
    },
  ],
  [
    'clean',
    (args) => (isForce(args) ? ['git clean -f 는 추적하지 않는 파일을 지운다'] : []),
  ],
  [
    'branch',
    (args) => {
      const deleting = args.includes('--delete') || hasShort(args, 'd');
      const risky =
        hasShort(args, 'D') ||
        (deleting && isForce(args)) ||
        (isForce(args) && positionalOf(args).length > 0);
      return risky ? ['git branch -D/-f 는 병합되지 않은 커밋이 있어도 브랜치를 지우거나 옮긴다'] : [];
    },
  ],
  [
    'push',
    (args) => {
      const reasons = [];
      const forced =
        isForce(args) ||
        args.some((arg) => arg.startsWith('--force-with-lease') || arg === '--force-if-includes');
      if (forced) reasons.push('git push --force 는 원격 기록을 덮어쓴다');
      if (args.includes('--mirror')) reasons.push('git push --mirror 는 원격 브랜치를 통째로 맞춘다');
      const deleting = args.includes('--delete') || hasShort(args, 'd');
      const refspecDelete = positionalOf(args).some((arg) => arg.startsWith(':'));
      if (deleting || refspecDelete) reasons.push('git push 로 원격 브랜치를 지운다');
      if (positionalOf(args).some((arg) => arg.startsWith('+'))) {
        reasons.push('git push +<refspec> 는 원격 기록을 덮어쓴다');
      }
      return reasons;
    },
  ],
  [
    'stash',
    (args) =>
      ['drop', 'clear'].includes(positionalOf(args)[0])
        ? ['git stash drop/clear 는 보관한 변경을 지운다']
        : [],
  ],
  [
    'reflog',
    (args) =>
      ['expire', 'delete'].includes(positionalOf(args)[0])
        ? ['git reflog expire/delete 는 복구 기록을 지운다']
        : [],
  ],
  [
    'worktree',
    (args) =>
      positionalOf(args)[0] === 'remove' && isForce(args)
        ? ['git worktree remove --force 는 변경이 있는 작업 트리를 지운다']
        : [],
  ],
]);

function findReasons(command) {
  return parseCommand(command).flatMap((words) => {
    const git = parseGit(words);
    const rule = git && RULES.get(git.subcommand);
    return rule ? rule(git.args) : [];
  });
}

function main(raw) {
  if (process.env.HARNESS_BYPASS_DESTRUCTIVE === '1') return 0;

  const command = readCommand(raw);
  const reasons = findReasons(command);
  if (reasons.length === 0) return 0;

  const lines = [
    '[harness] 차단: 되돌릴 수 없는 git 명령입니다.',
    `         명령: ${command.trim().split('\n')[0].slice(0, 200)}`,
    ...reasons.map((reason) => `         사유: ${reason}`),
    '         꼭 필요하면 Claude Code 를 띄우기 전에 HARNESS_BYPASS_DESTRUCTIVE=1 을 설정하세요.',
  ];
  process.stderr.write(`${lines.join('\n')}\n`);
  return 2;
}

if (require.main === module) {
  runHook(main);
}

module.exports = { findReasons, main };
