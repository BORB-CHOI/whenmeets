#!/usr/bin/env node
// PreToolUse hook: block destructive git operations.
// Blocks: reset --hard, restore <path>, checkout HEAD --, checkout -- <path>,
//         clean -f, branch -D, push --force, push -f, push --force-with-lease.
// Allows: status/diff/log/fetch/merge/checkout <branch>/checkout -b/restore --staged/reset (soft/mixed).
//
// Bypass for one-off intentional use:
//   set HARNESS_BYPASS_DESTRUCTIVE=1 in the environment before the command.

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  if (process.env.HARNESS_BYPASS_DESTRUCTIVE === '1') {
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

  // Strip heredocs and quoted strings so we only match actual command tokens,
  // not literals inside commit messages, echo args, etc.
  function strip(s) {
    let t = s;
    // heredocs: <<EOF ... EOF, <<'EOF' ... EOF, <<-EOF ... EOF
    t = t.replace(/<<-?\s*'?([A-Za-z_][A-Za-z0-9_]*)'?[\s\S]*?\n\s*\1\b/g, ' ');
    // double-quoted (handle escapes)
    t = t.replace(/"(?:\\.|[^"\\])*"/g, '""');
    // single-quoted (no escapes inside)
    t = t.replace(/'[^']*'/g, "''");
    return t;
  }
  const cmd = strip(cmdRaw);

  const reasons = [];

  // git reset --hard / --keep
  if (/\bgit\s+reset\s+(?:--hard|--keep)\b/.test(cmd)) {
    reasons.push('git reset --hard/--keep discards working tree changes');
  }
  // git checkout HEAD -- <path> (revert)
  if (/\bgit\s+checkout\s+HEAD\s+--/.test(cmd)) {
    reasons.push('git checkout HEAD -- <path> reverts files to HEAD');
  }
  // git checkout -- <path>  (discard unstaged)
  if (/\bgit\s+checkout\s+--\s+\S/.test(cmd)) {
    reasons.push('git checkout -- <path> discards unstaged changes');
  }
  // git restore <path>  (without --staged) — discards working tree
  if (/\bgit\s+restore\b/.test(cmd) && !/--staged\b/.test(cmd) && !/--source\b/.test(cmd)) {
    // allow `git restore --staged ...` which only unstages
    reasons.push('git restore <path> discards working tree changes');
  }
  // git clean with -f
  if (/\bgit\s+clean\s+(?=[^\n]*\b-[a-zA-Z]*[fF])/.test(cmd)) {
    reasons.push('git clean -f deletes untracked files');
  }
  // git branch -D (force delete)
  if (/\bgit\s+branch\s+-D\b/.test(cmd)) {
    reasons.push('git branch -D force-deletes a branch (loses unmerged commits)');
  }
  // git push --force / -f / --force-with-lease
  if (/\bgit\s+push\b[^\n]*(?:\s--force\b|\s-f\b|\s--force-with-lease\b)/.test(cmd)) {
    reasons.push('git push --force rewrites remote history');
  }

  if (reasons.length === 0) {
    process.exit(0);
  }

  const lines = [
    '[harness] BLOCKED: destructive git command detected.',
    `         Command: ${cmd}`,
    ...reasons.map((r) => `         Reason : ${r}`),
    '         If intentional, set HARNESS_BYPASS_DESTRUCTIVE=1 for this command,',
    '         or temporarily disable the hook in .claude/settings.json.',
  ];
  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
});
