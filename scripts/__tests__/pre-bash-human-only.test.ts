import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HOOK_PATH = fileURLToPath(
  new URL('../../.claude/scripts/hooks/pre-bash-block-human-only.js', import.meta.url),
);
const CLEAN_ENV = { ...process.env, HARNESS_BYPASS_HUMAN_ONLY: '' };

const { findViolations, main } = createRequire(import.meta.url)(HOOK_PATH);

const bashInput = (command: string) =>
  JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

describe('findViolations: 차단', () => {
  it.each([
    'supabase db push',
    'supabase db push --linked',
    'supabase db reset',
    'supabase db reset --dry-run',
    'git status && npx supabase db push',
    'cd supabase && supabase db push',
    'supabase   db \t push',
  ])('%j 는 차단 대상이다', (command) => {
    expect(findViolations(command)).toHaveLength(1);
  });

  it.each([
    'npx supabase db push',
    'npx -y supabase db push',
    'npx supabase@latest db push',
    'npx supabase@1.2.3 db push --linked',
    'bunx supabase db reset',
    'pnpx supabase db push',
    'pnpm dlx supabase db push',
    'npm exec supabase db push',
    'yarn dlx supabase db push',
    './node_modules/.bin/supabase db push',
    'supabase.exe db push',
    '"C:\\tools\\supabase.cmd" db push',
  ])('실행 방식이 다른 %j 도 차단한다', (command) => {
    expect(findViolations(command)).toHaveLength(1);
  });

  it.each([
    'supabase --debug db push',
    'supabase --workdir ../x db push',
    'supabase db --debug push',
    'npx supabase --workdir x db push',
    'supabase db push --dry-run=false',
    'supabase db push --linked --dry-run=false',
    'supabase db push # --dry-run',
    'supabase db push -h --dry-run=false',
  ])('옵션 위치나 값이 다른 %j 도 차단한다', (command) => {
    expect(findViolations(command)).toHaveLength(1);
  });

  it.each([
    'FOO=1 supabase db push',
    'sudo supabase db push',
    'supabase db \\\n  push',
    'supabase \\\n db push',
    '"supabase" db push',
    '(supabase db push)',
    'supabase db push &',
    'echo ok & supabase db push',
    "bash -c 'supabase db push'",
    'sh -c "cd x && supabase db push"',
    'eval "supabase db push"',
    'echo "$(supabase db push)"',
    'echo `supabase db reset`',
    'if true; then supabase db push; fi',
  ])('명령을 감싼 %j 도 차단한다', (command) => {
    expect(findViolations(command)).toHaveLength(1);
  });

  it.each([
    'supabase migration up --linked',
    'supabase migration down --linked',
    'supabase migration repair --db-url postgres://x 001',
  ])('원격 DB 를 바꾸는 %j 도 차단한다', (command) => {
    expect(findViolations(command)).toHaveLength(1);
  });
});

describe('findViolations: 통과', () => {
  it.each([
    'supabase db push --dry-run',
    'supabase db push --dry-run=true',
    'npx supabase db push --dry-run',
    'npx supabase@latest db push --linked --dry-run',
    'supabase db diff',
    'supabase db diff --linked',
    'supabase db pull',
    'supabase migration list',
    'supabase migration list --linked',
    'supabase migration up',
    'supabase start',
    'supabase status',
    'npm run test',
    '',
  ])('%j 는 통과시킨다', (command) => {
    expect(findViolations(command)).toEqual([]);
  });

  it.each([
    'echo "supabase db push"',
    'echo supabase db push',
    "printf '%s\\n' supabase db push",
    'grep -rn "supabase db push" docs',
    'cat docs/supabase-db-push.md',
    "git commit -m 'docs: supabase db push 안내'",
    'git commit -m "$(cat <<\'EOF\'\nsupabase db push\nEOF\n)"',
    'cat <<EOF\nsupabase db push\nEOF',
    "echo '$(supabase db push)'",
    'echo a # supabase db push',
  ])('명령이 아니라 글자인 %j 는 통과시킨다', (command) => {
    expect(findViolations(command)).toEqual([]);
  });
});

describe('main', () => {
  let stderr: string;

  beforeEach(() => {
    stderr = '';
    vi.stubEnv('HARNESS_BYPASS_HUMAN_ONLY', '');
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('차단 대상이면 2 를 돌려주고 사유와 우회 안내를 stderr 에 쓴다', () => {
    expect(main(bashInput('npx supabase db push'))).toBe(2);
    expect(stderr).toContain('db push');
    expect(stderr).toContain('--dry-run');
    expect(stderr).toContain('HARNESS_BYPASS_HUMAN_ONLY');
  });

  it('통과 대상이면 0 을 돌려준다', () => {
    expect(main(bashInput('npm run test'))).toBe(0);
    expect(stderr).toBe('');
  });

  it.each(['not json', 'null', '', '{}', '{"tool_input":null}', '{"tool_input":{"command":["x"]}}'])(
    '입력이 %j 이면 0 을 돌려준다',
    (raw) => {
      expect(main(raw)).toBe(0);
    },
  );

  it('우회 환경변수가 1이면 0 을 돌려준다', () => {
    vi.stubEnv('HARNESS_BYPASS_HUMAN_ONLY', '1');

    expect(main(bashInput('npx supabase db push'))).toBe(0);
  });
});

describe('훅 프로세스', () => {
  const runHook = (stdin: string) =>
    spawnSync(process.execPath, [HOOK_PATH], { input: stdin, encoding: 'utf8', env: CLEAN_ENV });

  it('db push 는 종료 코드 2 로 끝난다', () => {
    const result = runHook(bashInput('npx supabase db push'));

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('[harness]');
  });

  it('db push --dry-run 은 종료 코드 0 으로 끝난다', () => {
    expect(runHook(bashInput('npx supabase db push --dry-run')).status).toBe(0);
  });

  it('깨진 JSON 은 종료 코드 0 으로 끝난다', () => {
    expect(runHook('not json').status).toBe(0);
  });
});
