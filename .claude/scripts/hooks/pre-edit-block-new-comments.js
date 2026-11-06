#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const CODE_EXT = /\.(?:[cm]?[jt]sx?|css)$/i;
const SCOPE = /(?:^|\/)(?:src|scripts)\//;
const VENDOR = /(?:^|\/)node_modules\//;
const DIRECTIVE = /^(?:eslint-|@ts-|prettier-ignore|istanbul |c8 |v8 ignore|\/\s*<reference)/;
const REGEX_PREFIX_CHARS = '(,=:[!&|?{};+-*%~^';
const REGEX_PREFIX_WORD = /(?:^|[^\w$])(?:return|typeof|case|void|delete|throw|in|of)$/;

function skipQuoted(text, start, quote) {
  let i = start + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      i += 2;
    } else if (ch === quote) {
      return i + 1;
    } else if (ch === '\n' && quote !== '`') {
      return i;
    } else {
      i += 1;
    }
  }
  return i;
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
  if (REGEX_PREFIX_CHARS.includes(text[j])) return true;
  return REGEX_PREFIX_WORD.test(text.slice(Math.max(0, j - 10), j + 1));
}

function readComment(text, start) {
  const isBlock = text[start + 1] === '*';
  const end = isBlock ? text.indexOf('*/', start + 2) : text.indexOf('\n', start);
  const bodyEnd = end === -1 ? text.length : end;
  const next = isBlock && end !== -1 ? end + 2 : bodyEnd;
  return { body: text.slice(start + 2, bodyEnd), next };
}

function isCommentStart(text, i) {
  if (text[i] !== '/') return false;
  if (text[i + 1] === '*') return true;
  return text[i + 1] === '/' && text[i - 1] !== ':';
}

function scanComments(text) {
  const bodies = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipQuoted(text, i, ch);
    } else if (isCommentStart(text, i)) {
      const comment = readComment(text, i);
      bodies.push(comment.body);
      i = comment.next;
    } else if (ch === '/' && regexAllowed(text, i)) {
      i = skipRegex(text, i);
    } else {
      i += 1;
    }
  }
  return bodies;
}

function countComments(text) {
  if (typeof text !== 'string') return 0;
  return scanComments(text).filter((body) => !DIRECTIVE.test(body.trim())).length;
}

function isTracked(file) {
  const normalized = file.replace(/\\/g, '/');
  return CODE_EXT.test(normalized) && SCOPE.test(normalized) && !VENDOR.test(normalized);
}

function baselineCount(file) {
  try {
    return countComments(fs.readFileSync(path.resolve(file), 'utf8'));
  } catch {
    return 0;
  }
}

function countAdded(tool, input) {
  if (tool === 'Edit') return countComments(input.new_string) - countComments(input.old_string);
  if (tool === 'Write') return countComments(input.content) - baselineCount(input.file_path);
  return 0;
}

function findAddedComments(tool, input) {
  if (!input || typeof input.file_path !== 'string' || !isTracked(input.file_path)) return null;
  const added = countAdded(tool, input);
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
    '         eslint-disable, @ts-expect-error 같은 지시어는 허용됩니다.',
    '         한 번만 우회: Claude Code 를 띄우기 전에 HARNESS_BYPASS_COMMENT_BLOCK=1 을 설정하세요.',
  ].join('\n') + '\n';
}

function main(raw) {
  if (process.env.HARNESS_BYPASS_COMMENT_BLOCK === '1') return 0;
  const input = parseInput(raw);
  const hit = findAddedComments(input.tool_name, input.tool_input);
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
