import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const HOOK_PATH = join(REPO_ROOT, '.claude', 'scripts', 'hooks', 'post-edit-typecheck.js');
const SETTINGS_PATH = join(REPO_ROOT, '.claude', 'settings.json');
const SANDBOX_BASE = join(REPO_ROOT, 'node_modules', '.cache', 'post-edit-typecheck-test');
const EDITED_FILE = join(REPO_ROOT, 'src', 'a.ts');

const { buildReport, main, TIMEOUT_MS } = createRequire(import.meta.url)(HOOK_PATH);

const CLEAN_ENV = { ...process.env, HARNESS_BYPASS_TYPECHECK: '' };

const errorLine = (file: string, n = 1) => `${file}(${n},1): error TS2322: Type mismatch`;
const hookInput = (filePath: string) => JSON.stringify({ tool_input: { file_path: filePath } });

describe('buildReport', () => {
  it('편집한 파일의 오류를 먼저 보여주고 넘치는 건수를 센다', () => {
    const others = Array.from({ length: 40 }, (_, i) => errorLine(`src/other${i}.ts`));
    const output = [...others, errorLine('src/a.ts', 2)].join('\n');

    const report = buildReport(output, 'src/a.ts');
    const lines = report.split('\n');

    expect(lines[0]).toContain('오류 41건');
    expect(lines[0]).toContain('src/a.ts 에서 1건');
    expect(lines[2]).toContain('src/a.ts(2,1)');
    expect(lines).toHaveLength(2 + 30 + 1);
    expect(lines[lines.length - 1]).toContain('외 11건');
  });

  it('오류가 30건 이하면 넘침 안내를 붙이지 않는다', () => {
    const output = [errorLine('src/a.ts'), errorLine('src/b.ts')].join('\n');

    const report = buildReport(output, 'src/a.ts');

    expect(report).not.toContain('외 ');
  });

  it('error TS 가 없는 이어지는 줄은 건수에 넣지 않는다', () => {
    const output = [errorLine('src/a.ts'), '  Type X is not assignable to type Y.'].join('\n');

    const report = buildReport(output, 'src/a.ts');

    expect(report.split('\n')[0]).toContain('오류 1건');
    expect(report).not.toContain('is not assignable');
  });
});

describe('main', () => {
  let stderr: string;

  beforeEach(() => {
    stderr = '';
    vi.stubEnv('HARNESS_BYPASS_TYPECHECK', '');
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('.ts 가 아닌 파일은 tsc 를 돌리지 않고 통과시킨다', () => {
    const run = vi.fn();

    expect(main(hookInput('README.md'), run)).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['null', '', '{}', '{"tool_input":null}', '[]', '123', '"text"'])(
    '입력이 %j 이면 tsc 를 돌리지 않고 통과시킨다',
    (raw) => {
      const run = vi.fn();

      expect(main(raw, run)).toBe(0);
      expect(run).not.toHaveBeenCalled();
    },
  );

  it('깨진 JSON 입력은 통과시킨다', () => {
    const run = vi.fn();

    expect(main('not json', run)).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['a.ts', 'a.tsx', 'a.mts', 'a.cts', 'a.d.ts'])('%s 는 tsc 를 돌린다', (name) => {
    const run = vi.fn().mockReturnValue({ status: 0, stdout: '' });

    main(hookInput(join(REPO_ROOT, 'src', name)), run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it.each(['a.js', 'a.json', 'a.css', 'a.md'])('%s 는 tsc 를 돌리지 않는다', (name) => {
    const run = vi.fn();

    main(hookInput(join(REPO_ROOT, 'src', name)), run);

    expect(run).not.toHaveBeenCalled();
  });

  it('프로젝트 밖의 .ts 파일은 tsc 를 돌리지 않고 통과시킨다', () => {
    const run = vi.fn();

    expect(main(hookInput(join(tmpdir(), 'helper.ts')), run)).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it('우회 환경변수가 1이면 통과시킨다', () => {
    vi.stubEnv('HARNESS_BYPASS_TYPECHECK', '1');
    const run = vi.fn();

    expect(main(hookInput(EDITED_FILE), run)).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it('tsc 가 성공하면 0 을 돌려주고 아무것도 출력하지 않는다', () => {
    const run = vi.fn().mockReturnValue({ status: 0, stdout: '' });

    expect(main(hookInput(EDITED_FILE), run)).toBe(0);
    expect(stderr).toBe('');
  });

  it('타입 오류가 있으면 2 를 돌려주고 편집한 파일 건수를 stderr 에 쓴다', () => {
    const stdout = [errorLine('src/a.ts'), errorLine('src/b.ts')].join('\n');
    const run = vi.fn().mockReturnValue({ status: 2, stdout });

    expect(main(hookInput(EDITED_FILE), run)).toBe(2);
    expect(stderr).toContain('타입 검사 실패');
    expect(stderr).toContain('src/a.ts 에서 1건');
    expect(stderr).toContain('src/a.ts(1,1)');
  });

  it('error TS 줄 없이 비정상 종료하면 1 을 돌려주고 원인을 쓴다', () => {
    const run = vi
      .fn()
      .mockReturnValue({ status: 134, stdout: '', stderr: 'FATAL ERROR: heap out of memory' });

    expect(main(hookInput(EDITED_FILE), run)).toBe(1);
    expect(stderr).toContain('종료 코드 134');
    expect(stderr).toContain('heap out of memory');
    expect(stderr).not.toContain('오류 0건');
  });

  it('시간 초과는 1 을 돌려주고 시간 초과 문구를 쓴다', () => {
    const run = vi
      .fn()
      .mockReturnValue({ error: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }) });

    expect(main(hookInput(EDITED_FILE), run)).toBe(1);
    expect(stderr).toContain(`${TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다`);
  });

  it('시간 초과가 아닌 실행 오류는 원인 메시지를 그대로 쓴다', () => {
    const run = vi
      .fn()
      .mockReturnValue({ error: Object.assign(new Error('buffer full'), { code: 'ENOBUFS' }) });

    expect(main(hookInput(EDITED_FILE), run)).toBe(1);
    expect(stderr).toContain('buffer full');
    expect(stderr).not.toContain('초 안에 끝나지 않았습니다');
  });

  it('tsc 를 찾지 못해 실행 함수가 던지면 1 을 돌려준다', () => {
    const run = vi.fn().mockImplementation(() => {
      throw new Error('Cannot find module typescript');
    });

    expect(main(hookInput(EDITED_FILE), run)).toBe(1);
    expect(stderr).toContain('Cannot find module typescript');
  });
});

describe('settings.json 배선', () => {
  interface HookEntry {
    matcher: string;
    hooks: { command: string; timeout: number }[];
  }
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  const entry: HookEntry = settings.hooks.PostToolUse.find((e: HookEntry) =>
    e.hooks.some((h) => h.command.includes('post-edit-typecheck.js')),
  );

  it('Edit 와 Write 에 걸려 있다', () => {
    expect(entry.matcher.split('|')).toEqual(expect.arrayContaining(['Edit', 'Write']));
  });

  it('명령이 가리키는 훅 파일이 실제로 있다', () => {
    const quoted = /"([^"]*post-edit-typecheck\.js)"/.exec(entry.hooks[0].command);

    expect(quoted).not.toBeNull();
    expect(existsSync(join(REPO_ROOT, quoted![1]))).toBe(true);
  });

  it('하네스 timeout 이 훅 내부 timeout 보다 길다', () => {
    expect(entry.hooks[0].timeout).toBeGreaterThan(TIMEOUT_MS / 1000);
  });
});

describe('훅 프로세스', () => {
  const runHook = (stdin: string) =>
    spawnSync(process.execPath, [HOOK_PATH], { input: stdin, encoding: 'utf8', env: CLEAN_ENV });

  it('.md 파일이면 종료 코드 0 으로 끝난다', () => {
    const result = runHook(hookInput('README.md'));

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('깨진 JSON 이면 종료 코드 0 으로 끝난다', () => {
    expect(runHook('not json').status).toBe(0);
  });

  it('JSON null 이어도 종료 코드 0 으로 끝난다', () => {
    expect(runHook('null').status).toBe(0);
  });
});

describe('실제 tsc 연동', () => {
  const roots: string[] = [];

  function makeProject(baseDir: string, files: Record<string, string>): string {
    mkdirSync(baseDir, { recursive: true });
    const root = mkdtempSync(join(baseDir, 'project-'));
    roots.push(root);
    const hookDir = join(root, '.claude', 'scripts', 'hooks');
    mkdirSync(hookDir, { recursive: true });
    copyFileSync(HOOK_PATH, join(hookDir, 'post-edit-typecheck.js'));
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { noEmit: true, strict: true }, include: ['*.ts'] }),
    );
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(root, name), content);
    }
    return root;
  }

  const runInstalledHook = (root: string, file: string) =>
    spawnSync(
      process.execPath,
      [join(root, '.claude', 'scripts', 'hooks', 'post-edit-typecheck.js')],
      { input: hookInput(join(root, file)), encoding: 'utf8', env: CLEAN_ENV },
    );

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('오류가 있는 파일을 편집하면 종료 코드 2 와 그 파일의 오류를 보고한다', () => {
    const root = makeProject(SANDBOX_BASE, {
      'bad.ts': "export const n: number = 'x';\n",
      'good.ts': 'export const ok = 1;\n',
    });

    const result = runInstalledHook(root, 'bad.ts');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('bad.ts 에서 1건');
    expect(result.stderr).toMatch(/bad\.ts\(1,\d+\): error TS\d+/);
  }, 30000);

  it('오류 없는 파일을 편집해도 다른 파일의 오류는 0건 기준으로 함께 보고한다', () => {
    const root = makeProject(SANDBOX_BASE, {
      'bad.ts': "export const n: number = 'x';\n",
      'good.ts': 'export const ok = 1;\n',
    });

    const result = runInstalledHook(root, 'good.ts');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('good.ts 에서 0건');
    expect(result.stderr).toContain('bad.ts(1,');
  }, 30000);

  it('오류가 없으면 종료 코드 0 으로 조용히 끝난다', () => {
    const root = makeProject(SANDBOX_BASE, { 'good.ts': 'export const ok = 1;\n' });

    const result = runInstalledHook(root, 'good.ts');

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  }, 30000);

  it('typescript 를 찾을 수 없으면 종료 코드 1 과 실행하지 못했다는 문구를 낸다', () => {
    const root = makeProject(tmpdir(), { 'good.ts': 'export const ok = 1;\n' });

    const result = runInstalledHook(root, 'good.ts');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('실행하지 못했습니다');
  }, 30000);
});
