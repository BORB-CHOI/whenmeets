#!/usr/bin/env node
// PreToolUse hook: block direct commits to main/master.
// Blocks: `git commit ...` when current branch is main or master.
// Allows: commits on feature/fix/chore branches, all other git commands.
//
// Bypass for one-off intentional use:
//   set HARNESS_BYPASS_MAIN_COMMIT=1 in the environment before the command.

const { execSync } = require('child_process');

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  if (process.env.HARNESS_BYPASS_MAIN_COMMIT === '1') {
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }
  const cmdRaw = (input.tool_input && input.tool_input.command) || '';
  if (!cmdRaw) process.exit(0);

  // Detect `git commit` invocations. We strip heredocs and quoted strings first
  // so commit message bodies cannot accidentally match.
  function strip(s) {
    let t = s;
    t = t.replace(/<<-?\s*'?([A-Za-z_][A-Za-z0-9_]*)'?[\s\S]*?\n\s*\1\b/g, ' ');
    t = t.replace(/"(?:\\.|[^"\\])*"/g, '""');
    t = t.replace(/'[^']*'/g, "''");
    return t;
  }
  const cmd = strip(cmdRaw);

  if (!/\bgit\s+commit\b/.test(cmd)) {
    process.exit(0);
  }

  // Get current branch
  let branch = '';
  try {
    branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    process.exit(0); // git not available — let it fail naturally
  }

  if (branch !== 'main' && branch !== 'master') {
    process.exit(0);
  }

  const lines = [
    '[harness] BLOCKED: direct commit to ' + branch + ' is not allowed.',
    '         Command: ' + cmd,
    '         Workflow: create a feature branch first.',
    '           git checkout -b feat/<task-name>   # or fix/<task-name>',
    '         Then commit on that branch and open a PR back to ' + branch + '.',
    '         If absolutely necessary, set HARNESS_BYPASS_MAIN_COMMIT=1 for this command.',
  ];
  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
});
