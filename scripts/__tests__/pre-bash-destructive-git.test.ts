import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HOOK_PATH = fileURLToPath(
  new URL('../../.claude/scripts/hooks/pre-bash-block-destructive-git.js', import.meta.url),
);
const CLEAN_ENV = { ...process.env, HARNESS_BYPASS_DESTRUCTIVE: '' };

const { findReasons, main } = createRequire(import.meta.url)(HOOK_PATH);

const bashInput = (command: string) =>
  JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

describe('findReasons: 차단', () => {
  it.each([
    'git reset --hard',
    'git reset --hard HEAD~1',
    'git reset --keep HEAD~1',
    'git reset HEAD~1 --hard',
    'git reset -q --hard',
    'git checkout HEAD -- src/a.ts',
    'git checkout -- src/a.ts',
    'git checkout main -- src/a.ts',
    'git checkout .',
    'git checkout -f',
    'git checkout --force main',
    'git switch -f main',
    'git switch --discard-changes main',
    'git restore src/a.ts',
    'git restore --worktree src/a.ts',
    'git restore --staged --worktree src/a.ts',
    'git restore -SW src/a.ts',
    'git restore --source=HEAD~1 src/a.ts',
    'git restore --source HEAD~1 src/a.ts',
    'git clean -fd',
    'git clean -xdf',
    'git clean --force',
    'git branch -D feat/a',
    'git branch -vD feat/a',
    'git branch -fD feat/a',
    'git branch -d -D feat/a',
    'git branch --delete --force feat/a',
    'git branch -d -f feat/a',
    'git branch -f main HEAD~1',
    'git push --force',
    'git push -f origin feat/a',
    'git push -fu origin feat/a',
    'git push -uf origin feat/a',
    'git push -vf origin feat/a',
    'git push --force-with-lease origin feat/a',
    'git push --force-with-lease=feat/a origin feat/a',
    'git push --force-if-includes origin feat/a',
    'git push origin +feat/a',
    'git push origin +HEAD:feat/a',
    'git push origin :feat/a',
    'git push --delete origin feat/a',
    'git push -d origin feat/a',
    'git push --mirror',
    'git stash drop',
    'git stash clear',
    'git reflog expire --expire=now --all',
    'git worktree remove --force ../x',
  ])('%j 는 차단 대상이다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each([
    'git status && git reset --hard',
    'git add -A; git clean -fd',
    'git status & git reset --hard',
    'git status | git reset --hard',
    '(git reset --hard)',
    'git reset \\\n  --hard',
    'git push origin feat/a \\\n  --force',
    'FOO=1 git reset --hard',
    'sudo git clean -fd',
    'command git reset --hard',
    '\\git reset --hard',
    '"git" reset --hard',
    'git.exe reset --hard',
    '/usr/bin/git reset --hard',
    '"C:/Program Files/Git/bin/git.exe" reset --hard',
    'if true; then git reset --hard; fi',
  ])('명령을 감싼 %j 도 차단한다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each([
    'git -C . reset --hard',
    'git -C ../other reset --hard',
    'git -C../other reset --hard',
    'git -C "my dir" reset --hard',
    'git -c core.editor=true reset --hard',
    'git -ccore.editor=true reset --hard',
    'git --no-pager reset --hard',
    'git --git-dir .git reset --hard',
    'git --git-dir=.git reset --hard',
    'git --work-tree ../w reset --hard',
    'git -P reset --hard',
    'git -C ../other push --force origin feat/a',
    'git -C . clean -fd',
  ])('전역 옵션을 끼운 %j 도 차단한다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each([
    "bash -c 'git reset --hard'",
    'sh -c "git reset --hard"',
    "bash -lc 'cd x && git clean -fd'",
    'eval "git reset --hard"',
    'echo "$(git reset --hard)"',
    'echo $(git clean -fd)',
    'echo `git reset --hard`',
  ])('셸로 감싼 %j 도 차단한다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each([
    'xargs -n 1 git branch -D',
    'git branch --merged | grep -v main | xargs -n 1 git branch -D',
    'git branch --merged | xargs -r git branch -D',
    'echo x | xargs -I{} git reset --hard',
    'env -u FOO git reset --hard',
    'sudo -u deploy git reset --hard',
    'timeout 5 git reset --hard',
    'timeout -s KILL 5 git clean -fd',
    'nice -n 10 git clean -fd',
  ])('옵션 값을 받는 래퍼 뒤의 %j 도 차단한다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each([
    "bash <<'EOF'\ngit reset --hard\nEOF",
    'sh -s <<EOF\ngit clean -fd\nEOF',
    'bash <<< "git reset --hard"',
    "bash -c -- 'git reset --hard'",
    'cat <<EOF\n$(git reset --hard)\nEOF',
    "git commit -m $'don\\'t'; git reset --hard",
  ])('다른 모양으로 감싼 %j 도 차단한다', (command) => {
    expect(findReasons(command).length).toBeGreaterThan(0);
  });

  it.each(['git clean -nfd', 'git clean -n -f', 'git clean --dry-run -f', 'git clean -fdn'])(
    '미리보기 %j 는 통과시킨다',
    (command) => {
      expect(findReasons(command)).toEqual([]);
    },
  );

  describe('작업 트리에 있는 경로를 넘기는 checkout', () => {
    const cwd = fileURLToPath(new URL('.', import.meta.url));
    const file = 'command-parser.test.ts';

    it.each([`git checkout ${file}`, `git checkout HEAD ${file}`, `git -C ${cwd.split('\\').join('/')} checkout ${file}`])(
      '%j 는 차단한다',
      (command) => {
        expect(findReasons(command, cwd).length).toBeGreaterThan(0);
      },
    );

    it.each(['git checkout feat/a', 'git checkout main', 'git checkout -b __tests__', 'git switch __tests__'])(
      '브랜치로 보이는 %j 는 통과시킨다',
      (command) => {
        expect(findReasons(command, cwd)).toEqual([]);
      },
    );
  });

  it('여러 위험 명령이 이어지면 사유를 모두 돌려준다', () => {
    expect(findReasons('git reset --hard && git clean -fd')).toHaveLength(2);
  });
});

describe('findReasons: 통과', () => {
  it.each([
    'git status',
    'git diff --stat',
    'git log --oneline',
    'git log --grep="git push --force"',
    'git reset --soft HEAD~1',
    'git reset HEAD src/a.ts',
    'git reset --mixed HEAD~1',
    'git restore --staged src/a.ts',
    'git restore -S src/a.ts',
    'git restore --source=HEAD~1 --staged src/a.ts',
    'git checkout -b feat/a',
    'git checkout main',
    'git checkout feat/a',
    'git checkout -',
    'git switch feat/a',
    'git switch -c feat/a',
    'git branch',
    'git branch feat/a',
    'git branch -d feat/a',
    'git branch -m old new',
    'git branch -vv',
    'git clean -n',
    'git clean -nd',
    'git push origin feat/a',
    'git push -u origin feat/a',
    'git push --tags origin',
    'git push --follow-tags origin feat/a',
    'git stash',
    'git stash pop',
    'git stash list',
    'git reflog',
    'git worktree add ../x feat/a',
    'git worktree remove ../x',
    'git -C . status',
    'git -C . log --oneline',
  ])('%j 는 통과시킨다', (command) => {
    expect(findReasons(command)).toEqual([]);
  });

  it.each([
    'echo "git reset --hard"',
    'echo git reset --hard',
    "printf '%s\\n' git reset --hard",
    'grep -rn "git push --force" docs',
    'cat docs/git-clean.md',
    "git commit -m 'docs: git push --force 를 쓰지 않는다'",
    'git commit -m "$(cat <<\'EOF\'\ngit reset --hard\nEOF\n)"',
    'cat <<EOF\ngit reset --hard\nEOF',
    'echo a # git reset --hard',
    "echo '$(git reset --hard)'",
    'git restore --staged a.ts && git status',
    'npm run test',
    '',
  ])('명령이 아니라 글자인 %j 는 통과시킨다', (command) => {
    expect(findReasons(command)).toEqual([]);
  });
});

describe('main', () => {
  let stderr: string;

  beforeEach(() => {
    stderr = '';
    vi.stubEnv('HARNESS_BYPASS_DESTRUCTIVE', '');
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('차단 대상이면 2 를 돌려주고 사유와 우회 안내를 쓴다', () => {
    expect(main(bashInput('git reset --hard'))).toBe(2);
    expect(stderr).toContain('git reset');
    expect(stderr).toContain('Claude Code 를 띄우기 전에');
    expect(stderr).toContain('HARNESS_BYPASS_DESTRUCTIVE');
    expect(stderr).not.toContain('for this command');
  });

  it('긴 여러 줄 명령은 첫 줄만 보여준다', () => {
    main(bashInput(`git reset --hard\n${'x'.repeat(5000)}`));

    expect(stderr.length).toBeLessThan(1000);
  });

  it('통과 대상이면 0 을 돌려준다', () => {
    expect(main(bashInput('git status'))).toBe(0);
    expect(stderr).toBe('');
  });

  it.each(['not json', 'null', '', '{}', '{"tool_input":null}', '{"tool_input":{"command":5}}'])(
    '입력이 %j 이면 0 을 돌려준다',
    (raw) => {
      expect(main(raw)).toBe(0);
    },
  );

  it('우회 환경변수가 1이면 0 을 돌려준다', () => {
    vi.stubEnv('HARNESS_BYPASS_DESTRUCTIVE', '1');

    expect(main(bashInput('git reset --hard'))).toBe(0);
  });
});

describe('훅 프로세스', () => {
  const runHook = (stdin: string) =>
    spawnSync(process.execPath, [HOOK_PATH], { input: stdin, encoding: 'utf8', env: CLEAN_ENV });

  it('위험한 명령은 종료 코드 2 로 끝난다', () => {
    const result = runHook(bashInput('git -C . reset --hard'));

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('[harness]');
  });

  it('안전한 명령은 종료 코드 0 으로 끝난다', () => {
    expect(runHook(bashInput('git status')).status).toBe(0);
  });

  it('헤더 없는 쓰레기 입력도 종료 코드 0 으로 끝난다', () => {
    expect(runHook('\u0000\u0001garbage').status).toBe(0);
    expect(runHook('null').status).toBe(0);
  });

  it('아주 큰 명령도 1초 안에 끝난다', () => {
    const started = Date.now();

    const result = runHook(bashInput(`cat <<EOF\n${' \n'.repeat(60000)}git reset --hard`));

    expect(result.status).toBe(0);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
