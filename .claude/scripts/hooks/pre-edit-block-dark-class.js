#!/usr/bin/env node

const DARK_RE = /\bdark:[\w/\[\]\-.]+/g;
const FILE_EXT_RE = /\.(tsx?|jsx?|mdx?|css|html?|svelte|vue|astro)$/i;

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  if (process.env.HARNESS_BYPASS_DARK_BLOCK === '1') {
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
  const fp = ti.file_path || '';

  if (!FILE_EXT_RE.test(fp)) {
    process.exit(0);
  }

  let payload = '';
  if (tool === 'Edit') {
    payload = ti.new_string || '';
  } else if (tool === 'Write') {
    payload = ti.content || '';
  } else {
    process.exit(0);
  }

  const hits = payload.match(DARK_RE);
  if (!hits || hits.length === 0) {
    process.exit(0);
  }

  const unique = Array.from(new Set(hits)).slice(0, 8);
  const more = hits.length > unique.length ? ` (and ${hits.length - unique.length} more)` : '';

  const msg = [
    `[harness] BLOCKED: ${tool} introduces dark mode Tailwind classes in ${fp}.`,
    `         Dark mode is disabled project-wide (ThemeProvider forcedTheme="light",`,
    `         Tailwind dark variant remapped in globals.css). New \`dark:\` classes are`,
    `         dead code and the user has explicitly forbidden them.`,
    `         Detected: ${unique.join(', ')}${more}`,
    `         Bypass once: set HARNESS_BYPASS_DARK_BLOCK=1 in the environment.`,
  ];
  process.stderr.write(msg.join('\n') + '\n');
  process.exit(2);
});
