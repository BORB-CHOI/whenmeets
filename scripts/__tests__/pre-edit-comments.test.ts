import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK_PATH = fileURLToPath(
  new URL('../../.claude/scripts/hooks/pre-edit-block-new-comments.js', import.meta.url),
);
const CLEAN_ENV = { ...process.env, HARNESS_BYPASS_COMMENT_BLOCK: '' };

const { countComments, findAddedComments, main } = createRequire(import.meta.url)(HOOK_PATH);

const SLASHES = '//';
const BLOCK_OPEN = '/*';
const BLOCK_CLOSE = '*/';
const line = (text: string) => `${SLASHES} ${text}`;
const block = (text: string) => `${BLOCK_OPEN} ${text} ${BLOCK_CLOSE}`;

describe('countComments', () => {
  it.each([
    ['', 0],
    ['const a = 1;', 0],
    [line('설명'), 1],
    [`const a = 1; ${line('설명')}`, 1],
    [block('설명'), 1],
    [`${BLOCK_OPEN}*\n * 문서\n * 둘째 줄\n ${BLOCK_CLOSE}\nconst a = 1;`, 1],
    [`{${block('jsx')}}`, 1],
    [`a ${line('하나')}\nb ${line('둘')}`, 2],
    [`${block('css')} .a { color: red }`, 1],
  ])('%j 의 주석은 %i 개다', (text, expected) => {
    expect(countComments(text)).toBe(expected);
  });

  it.each([
    'const url = "http://example.com";',
    "const url = 'a // b';",
    'const url = `a // b`;',
    'const text = `첫 줄\n// 템플릿 안의 둘째 줄\n끝`;',
    "const quote = 'it\\'s // fine';",
    'const re = /https?:\\/\\//;',
    'const x = a / b / c;',
    "const html = '<a href=\"https://x.com\">link</a>';",
    'const glob = "src/**/*.ts";',
  ])('주석이 아닌 %j 는 0 개다', (text) => {
    expect(countComments(text)).toBe(0);
  });

  it.each([
    line('eslint-disable-next-line react/no-unescaped-entities'),
    block('eslint-disable'),
    line('@ts-expect-error 이유'),
    line('@ts-ignore'),
    line('@ts-nocheck'),
    line('prettier-ignore'),
    `${SLASHES}/ <reference types="node" />`,
    `const a = 1; ${line('eslint-disable-line no-console')}`,
  ])('지시어 %j 는 세지 않는다', (text) => {
    expect(countComments(text)).toBe(0);
  });

  it('JSX 텍스트의 작은따옴표는 다음 줄에 영향을 주지 않는다', () => {
    expect(countComments(`<p>Don't</p>\nconst a = 1; ${line('주석')}`)).toBe(1);
  });

  it('문자열이 아닌 값이 오면 0 이다', () => {
    expect(countComments(undefined)).toBe(0);
    expect(countComments(null)).toBe(0);
    expect(countComments(5)).toBe(0);
  });
});

describe('findAddedComments', () => {
  const roots: string[] = [];
  const makeFile = (name: string, content: string) => {
    const root = mkdtempSync(join(tmpdir(), 'comment-guard-'));
    roots.push(root);
    mkdirSync(join(root, 'src'), { recursive: true });
    const file = join(root, 'src', name);
    writeFileSync(file, content);
    return file;
  };

  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('Edit 로 주석을 늘리면 늘어난 개수를 돌려준다', () => {
    const input = { file_path: 'src/a.ts', old_string: line('하나'), new_string: `${line('하나')}\n${line('둘')}` };

    expect(findAddedComments('Edit', input)).toEqual({ file: 'src/a.ts', added: 1 });
  });

  it('Edit 로 주석 개수가 같거나 줄면 통과시킨다', () => {
    const base = { file_path: 'src/a.ts', old_string: line('하나'), new_string: line('고친 문장') };

    expect(findAddedComments('Edit', base)).toBeNull();
    expect(findAddedComments('Edit', { ...base, new_string: 'const a = 1;' })).toBeNull();
  });

  it('Edit 로 주석 없는 코드를 넣으면 통과시킨다', () => {
    const input = { file_path: 'src/a.ts', old_string: 'a', new_string: 'const b = 2;' };

    expect(findAddedComments('Edit', input)).toBeNull();
  });

  it('새 파일을 Write 하며 주석을 넣으면 개수를 돌려준다', () => {
    const input = { file_path: join(tmpdir(), 'no-such-dir', 'src', 'new.ts'), content: `${line('a')}\nconst x = 1;` };

    expect(findAddedComments('Write', input)).toMatchObject({ added: 1 });
  });

  it('새 파일을 주석 없이 Write 하면 통과시킨다', () => {
    const input = { file_path: join(tmpdir(), 'no-such-dir', 'src', 'new.ts'), content: 'export const x = 1;' };

    expect(findAddedComments('Write', input)).toBeNull();
  });

  it('기존 파일을 Write 로 덮어쓸 때는 기존 주석 개수를 넘는 만큼만 센다', () => {
    const file = makeFile('old.ts', `${line('기존 하나')}\n${line('기존 둘')}\nconst a = 1;`);

    expect(findAddedComments('Write', { file_path: file, content: `${line('기존 하나')}\n${line('기존 둘')}\nconst a = 2;` })).toBeNull();
    expect(findAddedComments('Write', { file_path: file, content: `${line('a')}\n${line('b')}\n${line('c')}` })).toMatchObject({ added: 1 });
  });

  it.each([
    'README.md',
    'docs/CHANGELOG.md',
    'package.json',
    'public/ads.txt',
    'node_modules/pkg/src/a.ts',
    'docs/example.ts',
  ])('범위 밖 파일 %s 은 통과시킨다', (file_path) => {
    const input = { file_path, old_string: 'a', new_string: line('주석') };

    expect(findAddedComments('Edit', input)).toBeNull();
  });

  it.each([
    'src/components/ui/Select.tsx',
    'src/lib/constants.ts',
    'src/app/globals.css',
    'scripts/check-component-map.mjs',
    '.claude/scripts/hooks/lib/command.js',
    'D:\\work\\whenmeets\\src\\lib\\a.ts',
  ])('범위 안 파일 %s 은 검사한다', (file_path) => {
    const input = { file_path, old_string: 'a', new_string: line('주석') };

    expect(findAddedComments('Edit', input)).toMatchObject({ added: 1 });
  });

  it('다른 도구는 통과시킨다', () => {
    expect(findAddedComments('Bash', { file_path: 'src/a.ts', new_string: line('주석') })).toBeNull();
  });
});

describe('main', () => {
  let stderr: string;
  const payload = (tool: string, toolInput: Record<string, unknown>) =>
    JSON.stringify({ tool_name: tool, tool_input: toolInput });

  beforeEach(() => {
    stderr = '';
    vi.stubEnv('HARNESS_BYPASS_COMMENT_BLOCK', '');
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('주석을 추가하는 편집은 2 를 돌려주고 안내를 쓴다', () => {
    const raw = payload('Edit', { file_path: 'src/a.ts', old_string: 'a', new_string: line('설명') });

    expect(main(raw)).toBe(2);
    expect(stderr).toContain('주석');
    expect(stderr).toContain('src/a.ts');
    expect(stderr).toContain('HARNESS_BYPASS_COMMENT_BLOCK');
  });

  it('주석을 추가하지 않는 편집은 0 을 돌려준다', () => {
    const raw = payload('Edit', { file_path: 'src/a.ts', old_string: 'a', new_string: 'b' });

    expect(main(raw)).toBe(0);
    expect(stderr).toBe('');
  });

  it.each(['null', '', '{}', '[]', 'not json', '{"tool_input":null}', '{"tool_name":"Edit","tool_input":{"file_path":5,"new_string":5}}'])(
    '입력이 %j 이면 0 을 돌려준다',
    (raw) => {
      expect(main(raw)).toBe(0);
    },
  );

  it('우회 환경변수가 1이면 0 을 돌려준다', () => {
    vi.stubEnv('HARNESS_BYPASS_COMMENT_BLOCK', '1');
    const raw = payload('Edit', { file_path: 'src/a.ts', old_string: 'a', new_string: line('설명') });

    expect(main(raw)).toBe(0);
  });
});

describe('훅 프로세스', () => {
  const run = (input: string) =>
    spawnSync(process.execPath, [HOOK_PATH], { input, encoding: 'utf8', env: CLEAN_ENV });

  it('주석을 추가하는 Write 는 종료 코드 2 로 끝난다', () => {
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: join(tmpdir(), 'nope', 'src', 'x.ts'), content: line('설명') },
    });

    const result = run(input);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('[harness]');
  });

  it('지시어만 추가하는 Edit 는 종료 코드 0 으로 끝난다', () => {
    const input = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: 'src/a.ts', old_string: 'a', new_string: line('eslint-disable-next-line x') },
    });

    expect(run(input).status).toBe(0);
  });

  it('쓰레기 입력은 종료 코드 0 으로 끝난다', () => {
    expect(run('null').status).toBe(0);
    expect(run('\u0000garbage').status).toBe(0);
  });
});
