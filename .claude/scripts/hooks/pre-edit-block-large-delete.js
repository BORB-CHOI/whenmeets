#!/usr/bin/env node
// PreToolUse hook: block Edit/Write that delete more than THRESHOLD lines in one call.
// Goal: catch wholesale rewrites that wipe features (the Codex incident).
//
// Edit: counts (lines in old_string) - (lines in new_string), multiplied by occurrence
//       count when replace_all is true.
// Write: counts (existing file lines) - (new content lines) when overwriting an
//        existing file. New file creation is always allowed.
//
// Bypass for one-off intentional use:
//   set HARNESS_BYPASS_LARGE_DELETE=1 in the environment before the operation.

const fs = require('fs');
const THRESHOLD = 100;

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  if (process.env.HARNESS_BYPASS_LARGE_DELETE === '1') {
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }
  const tool = input.tool_name;
  const ti = input.tool_input || {};

  function lines(s) {
    if (!s) return 0;
    return s.split('\n').length;
  }

  let deleted = 0;
  let context = '';

  if (tool === 'Edit') {
    const oldS = ti.old_string || '';
    const newS = ti.new_string || '';
    const fp = ti.file_path || '<unknown>';
    let occurrences = 1;
    if (ti.replace_all && fp && fs.existsSync(fp)) {
      try {
        const content = fs.readFileSync(fp, 'utf8');
        if (oldS) occurrences = Math.max(1, content.split(oldS).length - 1);
      } catch {
        /* ignore */
      }
    }
    deleted = (lines(oldS) - lines(newS)) * occurrences;
    context = `Edit ${fp} (replace_all=${!!ti.replace_all}, occurrences=${occurrences})`;
  } else if (tool === 'Write') {
    const fp = ti.file_path || '';
    const content = ti.content || '';
    if (fp && fs.existsSync(fp)) {
      try {
        const existing = fs.readFileSync(fp, 'utf8');
        deleted = lines(existing) - lines(content);
        context = `Write overwrites ${fp} (${lines(existing)} → ${lines(content)} lines)`;
      } catch {
        /* ignore */
      }
    } else {
      // new file — never block
      process.exit(0);
    }
  } else {
    process.exit(0);
  }

  if (deleted <= THRESHOLD) {
    process.exit(0);
  }

  const msg = [
    `[harness] BLOCKED: ${tool} would delete ${deleted} lines (threshold: ${THRESHOLD}).`,
    `         ${context}`,
    '         Reason: a single tool call removing this much code commonly wipes features.',
    '         Split into smaller edits, or set HARNESS_BYPASS_LARGE_DELETE=1 if intentional.',
  ];
  process.stderr.write(msg.join('\n') + '\n');
  process.exit(2);
});
