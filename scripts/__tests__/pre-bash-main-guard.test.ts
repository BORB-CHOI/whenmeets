import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os, { tmpdir } from 'node:os';
import path, { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK_PATH = fileURLToPath(
  new URL('../../.claude/scripts/hooks/pre-bash-block-main-commit.js', import.meta.url),
);
const NULL_DEVICE = process.platform === 'win32' ? 'NUL' : '/dev/null';

const isolatedEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  return {
    ...env,
    GIT_CONFIG_GLOBAL: NULL_DEVICE,
    GIT_CONFIG_SYSTEM: NULL_DEVICE,
    GIT_CONFIG_NOSYSTEM: '1',
    HARNESS_BYPASS_MAIN_COMMIT: '',
    ...extra,
  };
};

const { findViolations, main } = createRequire(import.meta.url)(HOOK_PATH);

const bashInput = (command: string) =>
  JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

const onBranch = (branch: string | null) => () => branch;
const kinds = (command: string, branch: string | null) =>
  findViolations(command, onBranch(branch)).map((v: { kind: string }) => v.kind);

describe('커밋 차단', () => {
  it.each([
    'git commit -m x',
    'git commit',
    'git -c user.name=x commit -m x',
    'git -cuser.name=x commit -m x',
    'git --no-pager commit -m x',
    'git status && git commit -m x',
    'git add -A; git commit -m x',
    'git status & git commit -m x',
    '(git commit -m x)',
    'echo $(git commit -m x)',
    'echo `git commit -m x`',
    'FOO=1 git commit -m x',
    'sudo git commit -m x',
    '\\git commit -m x',
    '"git" commit -m x',
    'git.exe commit -m x',
    '"C:/Program Files/Git/bin/git.exe" commit -m x',
    '/usr/bin/git commit -m x',
    'git \\\n  commit -m x',
    "bash -c 'git commit -m x'",
    'eval "git commit -m x"',
  ])('main 에서 %j 는 차단한다', (command) => {
    expect(kinds(command, 'main')).toEqual(['commit']);
  });

  it('master 에서도 차단한다', () => {
    expect(kinds('git commit -m x', 'master')).toEqual(['commit']);
  });

  it('기능 브랜치와 알 수 없는 브랜치의 커밋은 통과시킨다', () => {
    expect(kinds('git commit -m x', 'feat/a')).toEqual([]);
    expect(kinds('git commit -m x', null)).toEqual([]);
  });

  it.each([
    'echo "git commit"',
    "echo 'git commit -m x'",
    'echo git commit -m x',
    'grep -rn git commit docs',
    'git log --oneline',
    'git status',
    'git log --grep="git push origin main"',
    'gh pr create --head main',
    'npm run commit',
  ])('커밋이 아닌 %j 는 통과시킨다', (command) => {
    expect(kinds(command, 'main')).toEqual([]);
  });

  it('커밋 메시지 본문에 든 명령 문구는 무시한다', () => {
    const command = 'git commit -m "$(cat <<\'EOF\'\ngit push origin main\nEOF\n)"';

    expect(kinds(command, 'feat/a')).toEqual([]);
  });
});

describe('저장소 위치 추적', () => {
  const branchByDirName = (dir: string) => (basename(dir).startsWith('main') ? 'main' : 'feat/a');
  const check = (command: string) => findViolations(command, branchByDirName).length;

  it('-C 로 가리킨 디렉터리의 브랜치를 기준으로 판단한다', () => {
    expect(check('git -C ../main-repo commit -m x')).toBe(1);
    expect(check('git -C ../clean commit -m x')).toBe(0);
  });

  it.each([
    'git -C../main-repo commit -m x',
    'git -C "../main repo" commit -m x',
    'git -C .. -C main-repo commit -m x',
    'git -C ../main-repo -c user.name=x commit -m x',
  ])('옵션 모양이 다른 %j 도 -C 를 따라간다', (command) => {
    expect(check(command)).toBe(1);
  });

  it('cd 로 옮긴 디렉터리의 브랜치를 기준으로 판단한다', () => {
    expect(check('cd ../main-repo && git commit -m x')).toBe(1);
    expect(check('cd ../clean && git commit -m x')).toBe(0);
    expect(check('pushd ../main-repo; git push')).toBe(1);
  });

  it('Git Bash 식 /c/... 경로도 풀어서 본다', () => {
    const seen: string[] = [];
    findViolations('git -C /c/work/main-repo commit -m x', (dir: string) => {
      seen.push(dir);
      return 'feat/a';
    });

    expect(seen).toHaveLength(1);
    if (process.platform === 'win32') expect(seen[0].toLowerCase()).toContain('c:');
  });

  it('--git-dir 와 --work-tree 는 getBranch 에 그대로 넘긴다', () => {
    const calls: string[][] = [];
    findViolations('git --git-dir ../x/.git --work-tree ../x commit -m x', (_dir: string, args: string[]) => {
      calls.push(args);
      return 'main';
    });

    expect(calls[0]).toEqual(['--git-dir', '../x/.git', '--work-tree', '../x']);
  });

  it('같은 저장소는 브랜치를 한 번만 조회한다', () => {
    let calls = 0;
    findViolations('git commit -m a && git commit -m b && git push', () => {
      calls += 1;
      return 'feat/a';
    });

    expect(calls).toBe(1);
  });
});

describe('해석할 수 없는 디렉터리', () => {
  const calls: Array<string | null> = [];
  const recording = (dir: string) => {
    calls.push(dir);
    return 'main';
  };

  it.each([
    'cd "$CLAUDE_PROJECT_DIR" && git commit -m x',
    'cd "$(git rev-parse --show-toplevel)" && git commit -m x',
    'cd $PWD && git commit -m x',
    'git -C "$PWD" commit -m x',
    'git -C "$(git rev-parse --show-toplevel)" commit -m x',
  ])('%j 는 시작 디렉터리를 기준으로 판단해 main 이면 차단한다', (command) => {
    calls.length = 0;
    const start = path.resolve('/work/repo');

    expect(findViolations(command, recording, start)).toHaveLength(1);
    expect(calls[0]).toBe(start);
  });

  it('~ 로 시작하는 경로는 홈 디렉터리로 푼다', () => {
    calls.length = 0;
    findViolations('cd ~/proj && git commit -m x', recording, path.resolve('/work/repo'));

    expect(calls[0]).toBe(path.join(os.homedir(), 'proj'));
  });
});

describe('디렉터리 이동 추적', () => {
  const branchByDirName = (dir: string) => (path.basename(dir).startsWith('main') ? 'main' : 'feat/a');
  const check = (command: string) =>
    findViolations(command, branchByDirName, path.resolve('/work/main-repo')).length;

  it('cd - 는 직전 디렉터리로 돌아간다', () => {
    expect(check('cd ../feature && cd - && git commit -m x')).toBe(1);
    expect(check('cd ../feature && cd - && cd ../feature && git commit -m x')).toBe(0);
  });

  it('pushd 와 popd 는 스택으로 돌아간다', () => {
    expect(check('pushd ../feature; popd; git commit -m x')).toBe(1);
    expect(check('pushd ../feature; git commit -m x')).toBe(0);
  });

  it('cd 만 쓰면 홈 디렉터리로 옮긴다', () => {
    const seen: string[] = [];
    findViolations('cd && git commit -m x', (dir: string) => {
      seen.push(dir);
      return 'feat/a';
    });

    expect(seen[0]).toBe(os.homedir());
  });
});

describe('리다이렉션', () => {
  it.each([
    'git push origin HEAD:main>/dev/null',
    'git push origin main 2>&1',
    'git push origin main > push.log',
    'git push origin main >> push.log 2>&1',
    'git commit -m x 2>/dev/null',
  ])('%j 의 리다이렉션은 인자로 보지 않는다', (command) => {
    expect(kinds(command, 'main').length).toBeGreaterThan(0);
  });

  it('리다이렉션 대상 파일 이름을 푸시 대상으로 오인하지 않는다', () => {
    expect(kinds('git push origin feat/x > main', 'feat/a')).toEqual([]);
    expect(kinds('git push origin feat/x 2> master.log', 'feat/a')).toEqual([]);
  });
});

describe('서브셸과 치환의 범위', () => {
  const resolveRef = () => null;
  const run = (command: string, current: string, base = path.resolve('/work/repo')) =>
    findViolations(
      command,
      { getBranch: (dir: string) => (path.basename(dir) === 'other' ? 'feat/a' : current), resolveRef },
      base,
    ).length;

  it('서브셸 안의 브랜치 전환은 바깥으로 새지 않는다', () => {
    expect(run('(git checkout feat/a); git commit -m x', 'main')).toBe(1);
    expect(run('(git checkout feat/a && git commit -m x)', 'main')).toBe(0);
  });

  it('서브셸 안의 cd 는 바깥으로 새지 않는다', () => {
    expect(run('(cd ../other && git status); git commit -m x', 'main')).toBe(1);
    expect(run('(cd ../other && git commit -m x)', 'main')).toBe(0);
  });

  it('명령 치환 안의 cd 도 바깥으로 새지 않는다', () => {
    expect(run('echo $(cd ../other && pwd); git commit -m x', 'main')).toBe(1);
  });

  it('서브셸이 아닌 곳의 cd 는 이어진다', () => {
    expect(run('cd ../other && git commit -m x', 'main')).toBe(0);
    expect(run('cd ../other; git status; git commit -m x', 'main')).toBe(0);
  });

  it('중첩된 서브셸도 바깥 상태를 되돌린다', () => {
    expect(run('( (cd ../other) ; git commit -m x )', 'main')).toBe(1);
  });
});

describe('훅 입력의 cwd', () => {
  it('payload 의 cwd 를 시작 디렉터리로 쓴다', () => {
    const seen: string[] = [];
    const getBranch = (dir: string) => {
      seen.push(dir);
      return 'feat/a';
    };
    const raw = JSON.stringify({ cwd: process.cwd(), tool_input: { command: 'git commit -m x' } });

    main(raw, { getBranch });

    expect(seen[0]).toBe(process.cwd());
  });

  it('존재하지 않는 cwd 는 무시하고 프로세스 cwd 를 쓴다', () => {
    const seen: string[] = [];
    const getBranch = (dir: string) => {
      seen.push(dir);
      return 'feat/a';
    };
    const raw = JSON.stringify({ cwd: '/no/such/dir/xyz', tool_input: { command: 'git commit -m x' } });

    main(raw, { getBranch });

    expect(seen[0]).toBe(process.cwd());
  });
});

describe('브랜치 전환 대상 판정', () => {
  const resolveRef = (_dir: string, _args: string[], ref: string) => (ref === '@{-1}' ? 'main' : null);
  const run = (command: string, current: string) =>
    findViolations(command, { getBranch: () => current, resolveRef }, process.cwd()).length;

  it.each(['git checkout - && git commit -m x', 'git switch - && git commit -m x', 'git checkout @{-1} && git commit -m x'])(
    '직전 브랜치로 돌아가는 %j 는 직전 브랜치를 기준으로 판단한다',
    (command) => {
      expect(run(command, 'feat/z')).toBe(1);
    },
  );

  it.each(['git switch --track origin/main && git commit -m x', 'git checkout --track origin/main && git commit -m x'])(
    '원격 추적 브랜치를 만드는 %j 는 로컬 이름을 기준으로 판단한다',
    (command) => {
      expect(run(command, 'feat/a')).toBe(1);
    },
  );

  it('--detach 로 떼어낸 뒤의 커밋은 main 커밋이 아니다', () => {
    expect(run('git switch --detach main && git commit -m x', 'main')).toBe(0);
  });

  it('붙여 쓴 -b이름 도 새 브랜치로 본다', () => {
    expect(run('git checkout -bfeat/y && git commit -m x', 'main')).toBe(0);
  });

  it('작업 트리에 있는 파일 이름은 브랜치 전환이 아니다', () => {
    const file = path.basename(__filename);
    const cwd = path.dirname(__filename);
    const violations = findViolations(
      `git checkout ${file} && git commit -m x`,
      { getBranch: () => 'main', resolveRef },
      cwd,
    );

    expect(violations).toHaveLength(1);
  });
});

describe('같은 명령 안의 브랜치 전환', () => {
  it.each([
    'git checkout main && git commit -m x',
    'git switch main && git commit -m x',
    'git checkout master; git push',
    'git checkout main && git merge feat/a && git push',
  ])('기능 브랜치에서 main 으로 옮긴 뒤의 %j 는 차단한다', (command) => {
    expect(findViolations(command, onBranch('feat/a')).length).toBeGreaterThan(0);
  });

  it.each([
    'git checkout -b feat/z && git commit -m x',
    'git switch -c feat/z && git commit -m x',
    'git checkout feat/a && git commit -m x',
    'git switch feat/a && git push',
  ])('main 에서 기능 브랜치로 옮긴 뒤의 %j 는 통과시킨다', (command) => {
    expect(findViolations(command, onBranch('main'))).toEqual([]);
  });

  it('파일만 되돌리는 checkout -- 은 브랜치 전환으로 보지 않는다', () => {
    expect(kinds('git checkout feat/a -- src/a.ts && git commit -m x', 'main')).toEqual(['commit']);
  });
});

describe('푸시 차단', () => {
  it.each([
    'git push origin main',
    'git push origin master',
    'git push origin HEAD:main',
    'git push origin HEAD:refs/heads/main',
    'git push origin +feature:main',
    'git push origin :main',
    'git push --delete origin main',
    'git push --all origin',
    'git push --mirror',
    'git push -u origin main',
    'git push origin "HEAD:main"',
    "git push origin 'main'",
    'git push origin HEAD:"main"',
    "git push origin 'refs/heads/*:refs/heads/*'",
    'git push --repo=origin main',
    'git push -o ci.skip origin main',
    'git push --repo origin main',
    '(git push origin main)',
    'git status & git push origin main',
    'git \\\n push origin \\\n main',
    "bash -c 'git push origin main'",
    'git.exe push origin main',
    'git -C ../other push origin main',
  ])('기능 브랜치에서도 %j 는 차단한다', (command) => {
    expect(kinds(command, 'feat/a')).toEqual(['push']);
  });

  it.each(['git push', 'git push origin', 'git push origin HEAD', 'git push -u origin', 'git push --follow-tags'])(
    'main 에서 대상 없이 밀어 올리는 %j 는 차단한다',
    (command) => {
      expect(kinds(command, 'main')).toEqual(['push']);
    },
  );

  it.each([
    'git push',
    'git push origin',
    'git push origin HEAD',
    'git push -u origin chore/x',
    'git push origin main:feature',
    'git push origin HEAD:feature',
    'git push origin HEAD:refs/heads/feature',
    'git push --force-with-lease origin feat/a',
    'git push origin v1.0.0',
    'git push --tags',
    'git push origin --tags',
  ])('기능 브랜치에서 %j 는 통과시킨다', (command) => {
    expect(kinds(command, 'feat/a')).toEqual([]);
  });

  it.each([
    'git push origin $BRANCH',
    'git push -u origin "$(git branch --show-current)"',
    'git push origin "HEAD:refs/heads/$BR"',
  ])('변수나 치환으로 쓴 목적지 %j 는 현재 브랜치를 기준으로 판단한다', (command) => {
    expect(kinds(command, 'feat/a')).toEqual([]);
    expect(kinds(command, 'main')).toEqual(['push']);
  });

  it('main 에서 태그만 올리는 푸시는 통과시킨다', () => {
    expect(kinds('git push --tags', 'main')).toEqual([]);
    expect(kinds('git push origin --tags', 'main')).toEqual([]);
    expect(kinds('git push origin v0.7.2', 'main')).toEqual([]);
  });

  it('브랜치를 알 수 없을 때 HEAD 푸시는 예외 없이 통과한다', () => {
    expect(() => findViolations('git push origin HEAD', onBranch(null))).not.toThrow();
    expect(kinds('git push origin HEAD', null)).toEqual([]);
    expect(kinds('git push origin HEAD:HEAD', null)).toEqual([]);
    expect(kinds('git push -u origin +HEAD', null)).toEqual([]);
  });
});

describe('main', () => {
  let stderr: string;

  beforeEach(() => {
    stderr = '';
    vi.stubEnv('HARNESS_BYPASS_MAIN_COMMIT', '');
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('커밋 차단 사유와 안내를 stderr 에 쓴다', () => {
    expect(main(bashInput('git commit -m x'), onBranch('main'))).toBe(2);
    expect(stderr).toContain('main 브랜치에는 직접 커밋');
    expect(stderr).toContain('git checkout -b');
  });

  it('푸시 차단 사유에 대상 브랜치를 쓴다', () => {
    expect(main(bashInput('git push origin HEAD:master'), onBranch('feat/a'))).toBe(2);
    expect(stderr).toContain('푸시');
    expect(stderr).toContain('(master)');
  });

  it('--all 푸시는 플래그 이름을 쓴다', () => {
    main(bashInput('git push --all origin'), onBranch('feat/a'));

    expect(stderr).toContain('(--all)');
  });

  it('통과 대상이면 0 을 돌려준다', () => {
    expect(main(bashInput('git commit -m x'), onBranch('feat/a'))).toBe(0);
    expect(stderr).toBe('');
  });

  it.each(['not json', 'null', '', '{}', '{"tool_input":null}', '{"tool_input":{"command":5}}'])(
    '입력이 %j 이면 0 을 돌려준다',
    (raw) => {
      expect(main(raw, onBranch('main'))).toBe(0);
    },
  );

  it('우회 환경변수가 1이면 0 을 돌려준다', () => {
    vi.stubEnv('HARNESS_BYPASS_MAIN_COMMIT', '1');

    expect(main(bashInput('git commit -m x'), onBranch('main'))).toBe(0);
  });
});

describe('훅 프로세스와 실제 git 저장소', () => {
  const roots: string[] = [];

  function makeRepo(branch: string): string {
    const root = mkdtempSync(join(tmpdir(), 'main-guard-'));
    roots.push(root);
    const git = (...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: root,
        encoding: 'utf8',
        env: isolatedEnv(),
      });
    git('init', '-q');
    git('symbolic-ref', 'HEAD', `refs/heads/${branch}`);
    writeFileSync(join(root, 'a.txt'), 'x');
    git('add', '-A');
    git('commit', '-q', '-m', 'init');
    return root;
  }

  const runHook = (cwd: string, command: string) =>
    spawnSync(process.execPath, [HOOK_PATH], {
      input: bashInput(command),
      encoding: 'utf8',
      env: isolatedEnv(),
      cwd,
    });

  const forwardSlashes = (value: string) => value.split('\\').join('/');

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('main 브랜치에서 커밋은 종료 코드 2 로 끝난다', () => {
    const result = runHook(makeRepo('main'), 'git commit -m x');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('[harness]');
  });

  it('기능 브랜치에서 커밋은 종료 코드 0 으로 끝난다', () => {
    expect(runHook(makeRepo('feat/a'), 'git commit -m x').status).toBe(0);
  });

  it('git -C 로 main 저장소를 가리키면 다른 디렉터리에서 실행해도 차단한다', () => {
    const mainRepo = makeRepo('main');
    const featureRepo = makeRepo('feat/a');

    const result = runHook(featureRepo, `git -C ${forwardSlashes(mainRepo)} commit -m x`);

    expect(result.status).toBe(2);
  });

  it('따옴표로 감싼 -C 경로도 따라간다', () => {
    const mainRepo = makeRepo('main');
    const featureRepo = makeRepo('feat/a');

    const result = runHook(featureRepo, `git -C "${forwardSlashes(mainRepo)}" commit -m x`);

    expect(result.status).toBe(2);
  });

  it('cd 로 main 저장소에 들어간 뒤의 커밋을 차단한다', () => {
    const mainRepo = makeRepo('main');
    const featureRepo = makeRepo('feat/a');

    const result = runHook(featureRepo, `cd ${forwardSlashes(mainRepo)} && git commit -m x`);

    expect(result.status).toBe(2);
  });

  it('main 저장소에서 기능 저장소로 cd 한 뒤의 커밋은 통과시킨다', () => {
    const mainRepo = makeRepo('main');
    const featureRepo = makeRepo('feat/a');

    const result = runHook(mainRepo, `cd ${forwardSlashes(featureRepo)} && git commit -m x`);

    expect(result.status).toBe(0);
  });

  it('존재하지 않는 -C 경로는 통과시킨다', () => {
    expect(runHook(makeRepo('main'), 'git -C /no/such/dir/at/all commit -m x').status).toBe(0);
  });

  it('git checkout - 로 직전 main 브랜치로 돌아간 뒤의 커밋을 차단한다', () => {
    const root = makeRepo('main');
    execFileSync('git', ['checkout', '-q', '-b', 'feat/x'], { cwd: root, env: isolatedEnv() });

    expect(runHook(root, 'git checkout - && git commit -m x').status).toBe(2);
    expect(runHook(root, 'git commit -m x').status).toBe(0);
  });

  it('훅 입력의 cwd 가 가리키는 저장소를 기준으로 판단한다', () => {
    const mainRepo = makeRepo('main');
    const featureRepo = makeRepo('feat/a');
    const input = JSON.stringify({ cwd: mainRepo, tool_input: { command: 'git commit -m x' } });

    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input,
      encoding: 'utf8',
      env: isolatedEnv(),
      cwd: featureRepo,
    });

    expect(result.status).toBe(2);
  });

  it('기능 브랜치에서 main 으로 가는 푸시는 종료 코드 2 로 끝난다', () => {
    expect(runHook(makeRepo('feat/a'), 'git push origin HEAD:main').status).toBe(2);
  });

  it('detached HEAD 에서 HEAD 푸시는 예외 없이 종료 코드 0 으로 끝난다', () => {
    const root = makeRepo('feat/a');
    execFileSync('git', ['checkout', '-q', '--detach'], { cwd: root, env: isolatedEnv() });

    const result = runHook(root, 'git push origin HEAD');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('쓰레기 입력은 종료 코드 0 으로 끝난다', () => {
    const root = makeRepo('main');

    const result = spawnSync(process.execPath, [HOOK_PATH], {
      input: 'null',
      encoding: 'utf8',
      env: isolatedEnv(),
      cwd: root,
    });

    expect(result.status).toBe(0);
  });
});
