#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const CODE_EXT = /\.(?:[cm]?[jt]sx?|css)$/i;
const CSS_EXT = /\.css$/i;
const SCOPE = /(?:^|\/)(?:src|scripts)\//i;
const VENDOR = /(?:^|\/)node_modules\//i;
const DIRECTIVE =
  /^(?:eslint-(?:disable(?:-next-line|-line)?|enable|env)(?=\s|$)|@ts-(?:expect-error|ignore|nocheck|check)(?=\s|$)|prettier-ignore(?=\s|$)|(?:istanbul|c8|v8) ignore\b|\/\s*<reference\s)/;
const URL_SCHEME = /(?:https?|wss?|ftp|file)$/i;
const REGEX_PREFIX_CHARS = '(,=:[&|?{;!+-*~^';
const REGEX_PREFIX_WORD = /(?:^|[^\w$])(?:return|typeof|case|void|delete|throw|in|of)$/;

function skipQuoted(text, start, quote) {
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
    } else if (ch === quote) {
      return i + 1;
    } else if (ch === '\n') {
      return start + 1;
    } else {
      i += 1;
    }
  }
  return start + 1;
}

function skipRegex(text, start) {
  let i = start + 1;
  let inClass = false;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') return i;
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) return i + 1;
    i += 1;
  }
  return i;
}

function regexAllowed(text, index) {
  let j = index - 1;
  while (j >= 0 && /\s/.test(text[j])) j -= 1;
  if (j < 0) return true;
  const ch = text[j];
  const before = text[j - 1];
  if (ch === '>') return before === '=';
  if (ch === '!') return !/[\w$)\]]/.test(before || '');
  if (ch === '+' || ch === '-') return before !== ch;
  if (REGEX_PREFIX_CHARS.includes(ch)) return true;
  return REGEX_PREFIX_WORD.test(text.slice(Math.max(0, j - 10), j + 1));
}

function readComment(text, start) {
  const isBlock = text[start + 1] === '*';
  const end = isBlock ? text.indexOf('*/', start + 2) : text.indexOf('\n', start);
  const bodyEnd = end === -1 ? text.length : end;
  const next = isBlock && end !== -1 ? end + 2 : bodyEnd;
  return { body: text.slice(start + 2, bodyEnd), next };
}

function isCommentStart(text, i, css) {
  if (text[i] !== '/') return false;
  if (text[i + 1] === '*') return true;
  if (css || text[i + 1] !== '/') return false;
  const afterScheme = text[i - 1] === ':' && URL_SCHEME.test(text.slice(Math.max(0, i - 6), i - 1));
  return !afterScheme;
}

function scanBacktick(text, start, bodies) {
  const found = [];
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
    } else if (ch === '`') {
      bodies.push(...found);
      return i + 1;
    } else if (ch === '$' && text[i + 1] === '{') {
      i = scanCode(text, i + 2, found, false, true);
    } else {
      i += 1;
    }
  }
  return start + 1;
}

function scanCode(text, start, bodies, css, untilBrace) {
  let i = start;
  let depth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipQuoted(text, i, ch);
    } else if (ch === '`' && !css) {
      i = scanBacktick(text, i, bodies);
    } else if (isCommentStart(text, i, css)) {
      const comment = readComment(text, i);
      bodies.push(comment.body);
      i = comment.next;
    } else if (ch === '/' && !css && regexAllowed(text, i)) {
      i = skipRegex(text, i);
    } else if (untilBrace && ch === '}' && depth === 0) {
      return i + 1;
    } else {
      if (untilBrace && ch === '{') depth += 1;
      if (untilBrace && ch === '}') depth -= 1;
      i += 1;
    }
  }
  return i;
}

function commentBodies(text, css) {
  if (typeof text !== 'string') return [];
  const bodies = [];
  scanCode(text, 0, bodies, Boolean(css), false);
  return bodies
    .map((body) => body.replace(/^[*\s]+/, '').trim())
    .filter((body) => !DIRECTIVE.test(body));
}

function countComments(text, css) {
  return commentBodies(text, css).length;
}

function countNew(nextBodies, prevBodies) {
  const pool = new Map();
  for (const body of prevBodies) pool.set(body, (pool.get(body) || 0) + 1);
  let added = 0;
  for (const body of nextBodies) {
    const left = pool.get(body) || 0;
    if (left > 0) pool.set(body, left - 1);
    else added += 1;
  }
  return added;
}

function normalizePath(file) {
  return path.posix.normalize(file.replace(/\\/g, '/'));
}

function isTracked(file) {
  const normalized = normalizePath(file);
  return CODE_EXT.test(normalized) && SCOPE.test(normalized) && !VENDOR.test(normalized);
}

function baselineBodies(file, cwd, css) {
  try {
    const target = path.resolve(typeof cwd === 'string' && cwd ? cwd : process.cwd(), file);
    return commentBodies(fs.readFileSync(target, 'utf8'), css);
  } catch {
    return [];
  }
}

function countAdded(tool, input, cwd, css) {
  if (tool === 'Edit') {
    return countNew(commentBodies(input.new_string, css), commentBodies(input.old_string, css));
  }
  if (tool === 'Write') {
    return countNew(commentBodies(input.content, css), baselineBodies(input.file_path, cwd, css));
  }
  return 0;
}

function findAddedComments(tool, input, cwd) {
  if (!input || typeof input.file_path !== 'string' || !isTracked(input.file_path)) return null;
  const added = countAdded(tool, input, cwd, CSS_EXT.test(input.file_path));
  return added > 0 ? { file: input.file_path, added } : null;
}

function parseInput(raw) {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function buildMessage({ file, added }) {
  return [
    `[harness] 차단: ${file} 에 주석 ${added}개를 추가하는 편집입니다.`,
    '         이 프로젝트는 코드에 주석을 쓰지 않습니다. 의도는 이름과 구조로 드러내고 주석은 빼세요.',
    '         기존 주석을 지우거나 내용을 그대로 옮기는 편집은 통과합니다. 내용을 바꾸면 새 주석으로 셉니다.',
    '         eslint-disable, @ts-expect-error 같은 지시어는 허용됩니다.',
    '         한 번만 우회: Claude Code 를 띄우기 전에 HARNESS_BYPASS_COMMENT_BLOCK=1 을 설정하세요.',
  ].join('\n') + '\n';
}

function main(raw) {
  if (process.env.HARNESS_BYPASS_COMMENT_BLOCK === '1') return 0;
  const input = parseInput(raw);
  const hit = findAddedComments(input.tool_name, input.tool_input, input.cwd);
  if (!hit) return 0;
  process.stderr.write(buildMessage(hit));
  return 2;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => process.exit(main(raw)));
}

module.exports = { countComments, findAddedComments, main };
