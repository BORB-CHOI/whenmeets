import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import typecheckHook from '../.claude/scripts/hooks/post-edit-typecheck.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const hookDir = path.join(root, '.claude/scripts/hooks');

function parsePatch(command, cwd) {
  if (typeof command !== 'string') throw new Error('Missing apply_patch command');
  const lines = command.trim().replace(/\r\n/g, '\n').split('\n');
  if (lines.shift() !== '*** Begin Patch' || lines.pop() !== '*** End Patch') {
    throw new Error('Unrecognized apply_patch envelope');
  }
  const edits = [];
  let edit;
  for (const line of lines) {
    const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
    if (header) {
      edit = { kind: header[1], file: path.resolve(cwd, header[2]), old: [], next: [], added: [] };
      edits.push(edit);
    } else if (!edit) {
      throw new Error('Missing patch file header');
    } else if (line.startsWith('*** Move to: ') && edit.kind === 'Update') {
      edit.move = path.resolve(cwd, line.slice('*** Move to: '.length));
    } else if (line === '@@' || line.startsWith('@@ ') || line === '*** End of File') {
      continue;
    } else if (line.startsWith('+') && edit.kind !== 'Delete') {
      edit.next.push(line.slice(1));
      edit.added.push(line.slice(1));
    } else if (line.startsWith('-') && edit.kind === 'Update') {
      edit.old.push(line.slice(1));
    } else if (line.startsWith(' ') && edit.kind === 'Update') {
      edit.old.push(line.slice(1));
      edit.next.push(line.slice(1));
    } else if (line !== '') {
      throw new Error(`Unrecognized patch line: ${line.slice(0, 80)}`);
    }
  }
  if (!edits.length) throw new Error('Empty patch');
  return edits;
}

function runHook(name, input) {
  const result = spawnSync(process.execPath, [path.join(hookDir, `${name}.js`)], {
    cwd: input.cwd || root,
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 85000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.signal || result.status === null) {
    throw result.error || new Error(`Hook ${name} interrupted`);
  }
  if (result.status !== 0) return 2;
  return 0;
}

function checkEdit(edit, cwd) {
  const tool = edit.kind === 'Update' ? 'Edit' : 'Write';
  const file = edit.move || edit.file;
  const input = tool === 'Edit'
    ? { file_path: file, old_string: edit.old.join('\n'), new_string: edit.next.join('\n') }
    : { file_path: edit.file, content: edit.next.join('\n') };
  const payload = { cwd, tool_name: tool, tool_input: input };
  if (runHook('pre-edit-block-large-delete', payload)) return 2;
  const darkInput = { cwd, tool_name: 'Edit', tool_input: { file_path: file, new_string: edit.added.join('\n') } };
  if (runHook('pre-edit-block-dark-class', darkInput)) return 2;
  if (runHook('pre-edit-block-new-comments', payload)) return 2;
  return 0;
}

function checkDeletions(edits, cwd) {
  let deleted = 0;
  const count = (text) => text ? text.split('\n').length : 0;
  for (const edit of edits) {
    const before = edit.kind === 'Update'
      ? edit.old.join('\n')
      : fs.existsSync(edit.file) ? fs.readFileSync(edit.file, 'utf8') : '';
    deleted += Math.max(0, count(before) - count(edit.next.join('\n')));
  }
  return runHook('pre-edit-block-large-delete', {
    cwd,
    tool_name: 'Edit',
    tool_input: { old_string: Array(deleted).fill('line').join('\n'), new_string: '' },
  });
}

function main(input, run = runHook) {
  const cwd = typeof input.cwd === 'string' ? input.cwd : root;
  if (input.tool_name === 'Bash' && input.hook_event_name === 'PreToolUse') {
    for (const name of ['destructive-git', 'main-commit', 'human-only']) {
      if (runHook(`pre-bash-block-${name}`, { ...input, cwd })) return 2;
    }
    return 0;
  }
  if (input.tool_name !== 'apply_patch') return 0;
  const edits = parsePatch(input.tool_input?.command, cwd);
  if (input.hook_event_name === 'PreToolUse') {
    if (checkDeletions(edits, cwd)) return 2;
    for (const edit of edits) {
      if (checkEdit(edit, cwd)) return 2;
    }
  } else if (input.hook_event_name === 'PostToolUse') {
    const projects = new Set();
    const { TS_FILE } = typecheckHook;
    for (const file of edits.flatMap((edit) => [edit.file, edit.move].filter(Boolean))) {
      if (!TS_FILE.test(file)) continue;
      let dir = path.dirname(file);
      while (!fs.existsSync(path.join(dir, 'tsconfig.json')) && path.dirname(dir) !== dir) {
        dir = path.dirname(dir);
      }
      if (projects.has(dir)) continue;
      projects.add(dir);
      if (run('post-edit-typecheck', { cwd, tool_input: { file_path: file } })) return 2;
    }
  }
  return 0;
}

function runStdin() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    try {
      process.exitCode = main(JSON.parse(raw));
    } catch (error) {
      process.stderr.write(`[harness] Codex hook: ${error.message}\n`);
      process.exitCode = 2;
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runStdin();

export { main, parsePatch, runStdin };
