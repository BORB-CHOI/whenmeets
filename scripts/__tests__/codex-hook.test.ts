import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { main } from '../codex-hook.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const script = fileURLToPath(new URL('../codex-hook.mjs', import.meta.url));
const invoke = (tool: string, command: string, event = 'PreToolUse') =>
  spawnSync(process.execPath, [script], {
    cwd: root,
    input: JSON.stringify({ cwd: root, hook_event_name: event, tool_name: tool, tool_input: { command } }),
    encoding: 'utf8',
  });
const patch = (body: string) => `*** Begin Patch\n${body}\n*** End Patch`;

describe('Codex hook adapter', () => {
  it('blocks destructive commands and production migrations without executing them', () => {
    for (const command of ['git reset --hard', 'npx supabase db push']) {
      expect(invoke('Bash', command).status).toBe(2);
    }
    expect(invoke('Bash', 'git status --short').status).toBe(0);
  });

  it('checks every file in an apply_patch call', () => {
    const result = invoke('apply_patch', patch('*** Add File: src/ok.ts\n+export {};\n*** Add File: src/probe.tsx\n+const cls = "dark:bg-black";'));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('dark:');
  });

  it('blocks added comments but permits directives and existing comments', () => {
    expect(invoke('apply_patch', patch('*** Add File: src/probe.ts\n+// explanation\n+export {};')).status).toBe(2);
    expect(invoke('apply_patch', patch('*** Add File: src/probe.ts\n+// @ts-check\n+export {};')).status).toBe(0);
    expect(invoke('apply_patch', patch('*** Update File: src/probe.ts\n@@\n // existing\n-export const n = 1;\n+export const n = 2;')).status).toBe(0);
  });

  it('blocks deletion of a large existing file', () => {
    expect(invoke('apply_patch', patch('*** Delete File: src/app/globals.css')).status).toBe(2);
  });

  it('aggregates removed lines across update hunks', () => {
    const removed = Array.from({ length: 102 }, () => '-const n = 1;').join('\n');
    expect(invoke('apply_patch', patch(`*** Update File: src/probe.ts\n@@\n${removed}\n+export {};`)).status).toBe(2);
  });

  it('aggregates deletion across all files in one call', () => {
    const removed = Array.from({ length: 62 }, () => '-const n = 1;').join('\n');
    const body = ['src/one.ts', 'src/two.ts'].map((file) => `*** Update File: ${file}\n@@\n${removed}\n+export {};`).join('\n');
    expect(invoke('apply_patch', patch(body)).status).toBe(2);
  });

  it('checks the source TypeScript project when moving to a non-TypeScript destination', () => {
    const files: string[] = [];
    const command = patch('*** Update File: src/lib/constants.ts\n*** Move to: docs/constants.md\n@@\n-export {};\n+export {};');
    expect(main({ cwd: root, hook_event_name: 'PostToolUse', tool_name: 'apply_patch', tool_input: { command } }, (_name: string, input: { tool_input: { file_path: string } }) => {
      files.push(input.tool_input.file_path);
      return 0;
    })).toBe(0);
    expect(files).toEqual([join(root, 'src/lib/constants.ts')]);
  });

  it('fails closed for unrecognized patch syntax', () => {
    expect(invoke('apply_patch', 'invalid').status).toBe(2);
  });

  it('ignores unrelated tools and non-TypeScript post edits', () => {
    expect(invoke('other', '').status).toBe(0);
    expect(invoke('apply_patch', patch('*** Add File: docs/probe.md\n+hello'), 'PostToolUse').status).toBe(0);
  });

  it('loads configured hooks from a session started in a subdirectory', () => {
    const settings = JSON.parse(readFileSync(join(root, '.codex/hooks.json'), 'utf8'));
    for (const event of ['PreToolUse', 'PostToolUse']) {
      const entry = settings.hooks[event][0];
      expect(entry.matcher).toContain('apply_patch');
      const result = spawnSync(entry.hooks[0].command, {
        cwd: join(root, 'src'),
        shell: true,
        input: JSON.stringify({
          cwd: root,
          hook_event_name: event,
          tool_name: 'apply_patch',
          tool_input: { command: patch('*** Add File: docs/probe.md\n+hello') },
        }),
        encoding: 'utf8',
      });
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
    }
  });

  it('typechecks a TypeScript patch through the post-edit hook', () => {
    const result = invoke('apply_patch', patch('*** Update File: src/lib/constants.ts\n@@\n-export {};\n+export {};'), 'PostToolUse');
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  }, 90000);
});
