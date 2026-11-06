import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS_DIR = '../../.claude/scripts/hooks';
const LARGE_DELETE = fileURLToPath(new URL(`${HOOKS_DIR}/pre-edit-block-large-delete.js`, import.meta.url));
const DARK_CLASS = fileURLToPath(new URL(`${HOOKS_DIR}/pre-edit-block-dark-class.js`, import.meta.url));
const CLEAN_ENV = { ...process.env, HARNESS_BYPASS_LARGE_DELETE: '', HARNESS_BYPASS_DARK_BLOCK: '' };

const VARIANT = 'dark';
const darkClass = (name: string) => `${VARIANT}:${name}`;

const run = (hook: string, input: string, env = CLEAN_ENV) =>
  spawnSync(process.execPath, [hook], { input, encoding: 'utf8', env });

const edit = (toolInput: Record<string, unknown>) =>
  JSON.stringify({ tool_name: 'Edit', tool_input: toolInput });
const write = (toolInput: Record<string, unknown>) =>
  JSON.stringify({ tool_name: 'Write', tool_input: toolInput });

const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join('\n');

describe.each([
  ['대량 삭제 차단', LARGE_DELETE],
  ['다크 모드 클래스 차단', DARK_CLASS],
])('%s 훅의 입력 방어', (_name, hook) => {
  it.each([
    'null',
    '',
    '{}',
    '[]',
    '123',
    'not json',
    '{"tool_input":null}',
    '{"tool_name":"Edit","tool_input":null}',
    '{"tool_name":"Edit","tool_input":{"file_path":["a.tsx"],"old_string":5,"new_string":5}}',
    '{"tool_name":"Write","tool_input":{"file_path":5,"content":{"a":1}}}',
  ])('입력이 %j 이면 종료 코드 0 으로 끝난다', (raw) => {
    expect(run(hook, raw).status).toBe(0);
  });
});

describe('대량 삭제 차단 훅', () => {
  it('한 번에 100줄을 넘게 지우는 Edit 는 종료 코드 2 로 끝난다', () => {
    const result = run(LARGE_DELETE, edit({ file_path: 'a.ts', old_string: lines(150), new_string: 'x' }));

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('BLOCKED');
  });

  it('100줄 이하로 지우는 Edit 는 종료 코드 0 으로 끝난다', () => {
    const result = run(LARGE_DELETE, edit({ file_path: 'a.ts', old_string: lines(50), new_string: 'x' }));

    expect(result.status).toBe(0);
  });

  it('새 파일을 만드는 Write 는 종료 코드 0 으로 끝난다', () => {
    const result = run(LARGE_DELETE, write({ file_path: 'does-not-exist-xyz.ts', content: 'x' }));

    expect(result.status).toBe(0);
  });

  it('우회 환경변수가 1이면 종료 코드 0 으로 끝난다', () => {
    const env = { ...CLEAN_ENV, HARNESS_BYPASS_LARGE_DELETE: '1' };
    const result = run(LARGE_DELETE, edit({ file_path: 'a.ts', old_string: lines(150), new_string: 'x' }), env);

    expect(result.status).toBe(0);
  });
});

describe('다크 모드 클래스 차단 훅', () => {
  it('tsx 에 다크 모드 클래스를 넣는 Edit 는 종료 코드 2 로 끝난다', () => {
    const newString = `<div className="${darkClass('bg-black')}" />`;

    const result = run(DARK_CLASS, edit({ file_path: 'a.tsx', new_string: newString }));

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(darkClass('bg-black'));
  });

  it('다크 모드 클래스를 넣는 Write 도 종료 코드 2 로 끝난다', () => {
    const content = `.a { @apply ${darkClass('text-white')}; }`;

    expect(run(DARK_CLASS, write({ file_path: 'a.css', content })).status).toBe(2);
  });

  it('다크 모드 클래스가 없는 편집은 종료 코드 0 으로 끝난다', () => {
    const result = run(DARK_CLASS, edit({ file_path: 'a.tsx', new_string: '<div className="bg-white" />' }));

    expect(result.status).toBe(0);
  });

  it('코드 파일이 아니면 종료 코드 0 으로 끝난다', () => {
    const result = run(DARK_CLASS, edit({ file_path: 'notes.txt', new_string: darkClass('bg-black') }));

    expect(result.status).toBe(0);
  });

  it('우회 환경변수가 1이면 종료 코드 0 으로 끝난다', () => {
    const env = { ...CLEAN_ENV, HARNESS_BYPASS_DARK_BLOCK: '1' };
    const result = run(DARK_CLASS, edit({ file_path: 'a.tsx', new_string: darkClass('bg-black') }), env);

    expect(result.status).toBe(0);
  });
});
