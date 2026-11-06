import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));

interface HookEntry {
  matcher: string;
  hooks: { type: string; command: string; timeout?: number }[];
}

const entries: { event: string; entry: HookEntry }[] = Object.entries(settings.hooks).flatMap(
  ([event, list]) => (list as HookEntry[]).map((entry) => ({ event, entry })),
);

const scriptOf = (entry: HookEntry) =>
  /^node "\$CLAUDE_PROJECT_DIR\/([^"]+)"$/.exec(entry.hooks[0].command)?.[1] ?? null;

const scriptsFor = (event: string, matcher: string) =>
  entries
    .filter((item) => item.event === event && item.entry.matcher === matcher)
    .map((item) => scriptOf(item.entry));

describe('settings.json 훅 배선', () => {
  it('훅이 하나 이상 등록돼 있다', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const { event, entry } of entries) {
    describe(`${event} ${entry.matcher}`, () => {
      it('명령이 node "$CLAUDE_PROJECT_DIR/..." 형식이다', () => {
        expect(entry.hooks).toHaveLength(1);
        expect(scriptOf(entry)).not.toBeNull();
      });

      it('명령이 가리키는 스크립트 파일이 실제로 있다', () => {
        const script = scriptOf(entry);

        expect(script).not.toBeNull();
        expect(existsSync(join(REPO_ROOT, script!))).toBe(true);
      });
    });
  }

  it('매처는 Bash 와 Edit|Write 두 가지뿐이다', () => {
    expect([...new Set(entries.map((item) => item.entry.matcher))].sort()).toEqual([
      'Bash',
      'Edit|Write',
    ]);
  });

  it('Bash 훅은 파괴적 git 차단, main 보호, 사람 전용 명령 차단이 정확히 한 번씩 걸려 있다', () => {
    expect(scriptsFor('PreToolUse', 'Bash').sort()).toEqual([
      '.claude/scripts/hooks/pre-bash-block-destructive-git.js',
      '.claude/scripts/hooks/pre-bash-block-human-only.js',
      '.claude/scripts/hooks/pre-bash-block-main-commit.js',
    ]);
  });

  it('Edit 와 Write 의 사전 훅은 대량 삭제 차단과 다크 모드 클래스 차단이 정확히 한 번씩이다', () => {
    expect(scriptsFor('PreToolUse', 'Edit|Write').sort()).toEqual([
      '.claude/scripts/hooks/pre-edit-block-dark-class.js',
      '.claude/scripts/hooks/pre-edit-block-large-delete.js',
    ]);
  });

  it('편집 뒤 타입 검사 훅이 정확히 한 번 걸려 있다', () => {
    expect(scriptsFor('PostToolUse', 'Edit|Write')).toEqual([
      '.claude/scripts/hooks/post-edit-typecheck.js',
    ]);
  });

  it('훅 디렉터리의 스크립트는 하나도 빠짐없이 등록돼 있다', () => {
    const registered = new Set(entries.map((item) => scriptOf(item.entry)));
    const onDisk = readdirSync(join(REPO_ROOT, '.claude', 'scripts', 'hooks'), { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.js'))
      .map((file) => `.claude/scripts/hooks/${file.name}`);

    expect(onDisk.length).toBeGreaterThan(0);
    for (const script of onDisk) expect(registered.has(script)).toBe(true);
  });
});
