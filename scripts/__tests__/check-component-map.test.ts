import { afterEach, describe, expect, it } from 'vitest';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONVENTIONS_PATH, MAP_PATH, checkComponentMap } from '../check-component-map.mjs';

const SCRIPT_PATH = fileURLToPath(new URL('../check-component-map.mjs', import.meta.url));

const roots: string[] = [];

function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'map-check-'));
  roots.push(root);
  const defaults = { [MAP_PATH]: '', [CONVENTIONS_PATH]: '', 'package.json': '{}' };
  for (const [rel, content] of Object.entries({ ...defaults, ...files })) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('checkComponentMap', () => {
  it('맵과 파일이 일치하면 문제가 없다', () => {
    const root = makeRepo({
      [MAP_PATH]:
        '| `Button` | 버튼 | `src/components/ui/Button.tsx` |\n| `GET /api/events` | 목록 |',
      'src/components/ui/Button.tsx': 'export {}',
      'src/app/api/events/route.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('맵에 적힌 경로의 파일이 없으면 보고한다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `middleware.ts` | 세션 갱신 | `src/middleware.ts` |',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 적힌 파일이 없음: src/middleware.ts']);
  });

  it('맵에 없는 컴포넌트 파일을 보고한다', () => {
    const root = makeRepo({
      'src/components/ui/Modal.tsx': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 파일: src/components/ui/Modal.tsx']);
  });

  it('서버 계층 파일도 맵에 없으면 보고한다', () => {
    const root = makeRepo({
      'src/server/services/events.service.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([
      '맵에 없는 파일: src/server/services/events.service.ts',
    ]);
  });

  it('테스트 파일과 index.ts 는 검사에서 뺀다', () => {
    const root = makeRepo({
      'src/lib/__tests__/a.test.ts': 'export {}',
      'src/lib/ui/index.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('/api/events 가 /api/events/[id] 표기에 가려지지 않는다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `GET /api/events/[id]` | 상세 |',
      'src/app/api/events/route.ts': 'export {}',
      'src/app/api/events/[id]/route.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 API 라우트: /api/events']);
  });

  it('맵에 적힌 API 경로의 route.ts 가 없으면 보고한다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `DELETE /api/folders/[id]` | 폴더 삭제 |',
    });

    expect(checkComponentMap(root)).toEqual([
      '맵에 적힌 API 라우트 파일이 없음: /api/folders/[id]',
    ]);
  });

  it('conventions 에 없는 Radix 패키지를 보고한다', () => {
    const root = makeRepo({
      'package.json': JSON.stringify({ dependencies: { '@radix-ui/react-select': '^2.0.0' } }),
    });

    expect(checkComponentMap(root)).toEqual([
      '설치된 Radix 패키지가 conventions 에 없음: @radix-ui/react-select',
    ]);
  });

  it('대괄호가 든 페이지 경로도 파일이 없으면 보고하고 있으면 통과시킨다', () => {
    const map = '| `A` | 페이지 | `src/app/event/[id]/page.tsx` |';
    const missing = makeRepo({ [MAP_PATH]: map });
    const present = makeRepo({ [MAP_PATH]: map, 'src/app/event/[id]/page.tsx': 'export {}' });

    expect(checkComponentMap(missing)).toEqual([
      '맵에 적힌 파일이 없음: src/app/event/[id]/page.tsx',
    ]);
    expect(checkComponentMap(present)).toEqual([]);
  });

  it('같은 경로가 맵에 두 번 적혀 있어도 한 번만 보고한다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `A` | `src/lib/gone.ts` |\n| `B` | `src/lib/gone.ts` |',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 적힌 파일이 없음: src/lib/gone.ts']);
  });

  it('.test.tsx 파일은 검사에서 뺀다', () => {
    const root = makeRepo({ 'src/components/ui/Modal.test.tsx': 'export {}' });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('devDependencies 의 Radix 패키지도 conventions 에 없으면 보고한다', () => {
    const root = makeRepo({
      'package.json': JSON.stringify({ devDependencies: { '@radix-ui/react-dialog': '^1.0.0' } }),
    });

    expect(checkComponentMap(root)).toEqual([
      '설치된 Radix 패키지가 conventions 에 없음: @radix-ui/react-dialog',
    ]);
  });

  it('src/app 의 page.tsx 와 layout.tsx 가 맵에 없으면 보고한다', () => {
    const root = makeRepo({
      'src/app/guide/page.tsx': 'export {}',
      'src/app/e/[id]/layout.tsx': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([
      '맵에 없는 파일: src/app/e/[id]/layout.tsx',
      '맵에 없는 파일: src/app/guide/page.tsx',
    ]);
  });

  it('src/app 의 page.tsx 가 맵에 적혀 있으면 통과시킨다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `GuidePage` | 가이드 | `src/app/guide/page.tsx` |',
      'src/app/guide/page.tsx': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('src/app 의 page.tsx 와 layout.tsx 외 파일은 검사하지 않는다', () => {
    const root = makeRepo({
      'src/app/icon.tsx': 'export {}',
      'src/app/robots.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('ts 와 tsx 가 아닌 파일은 검사하지 않는다', () => {
    const root = makeRepo({
      'src/components/ui/style.css': '.a {}',
      'src/lib/data.json': '{}',
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('api 디렉터리의 route.ts 가 아닌 파일은 라우트로 세지 않는다', () => {
    const root = makeRepo({ 'src/app/api/events/helper.ts': 'export {}' });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('맵에 적힌 route.ts 파일 경로를 API 경로로 오인하지 않는다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `events route` | `src/app/api/events/route.ts` |',
      'src/app/api/events/route.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 API 라우트: /api/events']);
  });

  it('Radix 패키지가 conventions 에 있으면 통과하고 Radix 가 아닌 의존성은 무시한다', () => {
    const root = makeRepo({
      [CONVENTIONS_PATH]: '- `@radix-ui/react-select`',
      'package.json': JSON.stringify({
        dependencies: { '@radix-ui/react-select': '^2.0.0', react: '^19.0.0' },
      }),
    });

    expect(checkComponentMap(root)).toEqual([]);
  });

  it('HTML 주석 안의 경로는 맵에 적은 것으로 치지 않는다', () => {
    const root = makeRepo({
      [MAP_PATH]: '<!-- src/components/ui/Modal.tsx -->',
      'src/components/ui/Modal.tsx': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 파일: src/components/ui/Modal.tsx']);
  });

  it('src 아래 새로 생긴 폴더의 파일도 맵에 없으면 보고한다', () => {
    const root = makeRepo({ 'src/contexts/ThemeContext.tsx': 'export {}' });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 파일: src/contexts/ThemeContext.tsx']);
  });

  it('src 바로 아래의 파일도 맵에 없으면 보고한다', () => {
    const root = makeRepo({ 'src/proxy.ts': 'export {}' });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 파일: src/proxy.ts']);
  });

  it('src/app 의 api 밖 route.ts 가 맵에 없으면 보고한다', () => {
    const root = makeRepo({ 'src/app/auth/callback/route.ts': 'export {}' });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 파일: src/app/auth/callback/route.ts']);
  });

  it('API 경로가 주석에만 있으면 맵에 적은 것으로 치지 않는다', () => {
    const root = makeRepo({
      [MAP_PATH]: '<!-- GET /api/events -->',
      'src/app/api/events/route.ts': 'export {}',
    });

    expect(checkComponentMap(root)).toEqual(['맵에 없는 API 라우트: /api/events']);
  });

  it('문제가 여러 건이면 파일, 라우트, Radix 순서로 보고한다', () => {
    const root = makeRepo({
      [MAP_PATH]: '| `A` | `src/lib/gone.ts` |\n| `B` | `DELETE /api/old` |',
      'src/components/ui/New.tsx': 'export {}',
      'src/app/api/fresh/route.ts': 'export {}',
      'package.json': JSON.stringify({ dependencies: { '@radix-ui/react-select': '^2.0.0' } }),
    });

    expect(checkComponentMap(root)).toEqual([
      '맵에 적힌 파일이 없음: src/lib/gone.ts',
      '맵에 없는 파일: src/components/ui/New.tsx',
      '맵에 적힌 API 라우트 파일이 없음: /api/old',
      '맵에 없는 API 라우트: /api/fresh',
      '설치된 Radix 패키지가 conventions 에 없음: @radix-ui/react-select',
    ]);
  });

  it('package.json 이 올바른 JSON 이 아니면 던진다', () => {
    const root = makeRepo({ 'package.json': '{' });

    expect(() => checkComponentMap(root)).toThrow();
  });

  it('맵 파일이 없으면 던진다', () => {
    const root = mkdtempSync(join(tmpdir(), 'map-check-'));
    roots.push(root);
    writeFileSync(join(root, 'package.json'), '{}');

    expect(() => checkComponentMap(root)).toThrow();
  });
});

describe('명령줄 실행', () => {
  const runCli = (root: string) =>
    spawnSync(process.execPath, [SCRIPT_PATH], { cwd: root, encoding: 'utf8' });

  it('맵이 코드와 어긋나면 종료 코드 1 과 문제 목록을 stderr 에 낸다', () => {
    const root = makeRepo({ 'src/components/ui/Modal.tsx': 'export {}' });

    const result = runCli(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('맵에 없는 파일: src/components/ui/Modal.tsx');
  });

  it('심볼릭 링크 경로로 실행해도 검사를 건너뛰지 않는다', () => {
    const parent = mkdtempSync(join(tmpdir(), 'map-link-'));
    roots.push(parent);
    const realDir = join(parent, 'real');
    mkdirSync(join(realDir, 'lib'), { recursive: true });
    copyFileSync(SCRIPT_PATH, join(realDir, 'check-component-map.mjs'));
    copyFileSync(
      fileURLToPath(new URL('../lib/is-entry.mjs', import.meta.url)),
      join(realDir, 'lib', 'is-entry.mjs'),
    );
    const linkDir = join(parent, 'link');
    symlinkSync(realDir, linkDir, 'junction');
    const root = makeRepo({ 'src/components/ui/Modal.tsx': 'export {}' });

    const result = spawnSync(process.execPath, [join(linkDir, 'check-component-map.mjs')], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('맵에 없는 파일: src/components/ui/Modal.tsx');
  });

  it('맵이 코드와 맞으면 종료 코드 0 과 안내 문구를 stdout 에 낸다', () => {
    const result = runCli(makeRepo({}));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('일치합니다');
  });
});
