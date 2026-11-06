const os = require('os');
const path = require('path');

const SUBSTITUTION_MARK = '$()';
const MAX_DEPTH = 4;
const MAX_LENGTH = 200000;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const PREFIX_WORDS = new Set([
  '{',
  '}',
  '!',
  'if',
  'then',
  'else',
  'elif',
  'do',
  'while',
  'until',
  'time',
  'command',
  'builtin',
  'exec',
  'sudo',
  'env',
  'nohup',
  'nice',
  'xargs',
  'timeout',
]);
const WRAPPER_OPTIONS = new Map([
  [
    'xargs',
    {
      values: new Set([
        '-n',
        '-I',
        '-L',
        '-P',
        '-d',
        '-E',
        '-s',
        '-a',
        '--max-args',
        '--max-procs',
        '--max-lines',
        '--max-chars',
        '--delimiter',
        '--arg-file',
        '--eof',
      ]),
      skip: 0,
    },
  ],
  ['env', { values: new Set(['-u', '-C', '-S', '--unset', '--chdir', '--split-string']), skip: 0 }],
  [
    'sudo',
    {
      values: new Set([
        '-u',
        '-g',
        '-h',
        '-p',
        '-U',
        '-C',
        '-D',
        '-R',
        '-T',
        '-r',
        '-t',
        '--user',
        '--group',
        '--host',
        '--prompt',
        '--other-user',
        '--close-from',
        '--chdir',
        '--chroot',
        '--role',
        '--type',
        '--command-timeout',
      ]),
      skip: 0,
    },
  ],
  ['nice', { values: new Set(['-n', '--adjustment']), skip: 0 }],
  ['timeout', { values: new Set(['-s', '-k', '--signal', '--kill-after']), skip: 1 }],
  ['exec', { values: new Set(['-a']), skip: 0 }],
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const GIT_OPTIONS_WITH_VALUE = new Set([
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--super-prefix',
  '--config-env',
]);

let scopeStack = [];
let scopeCounter = 0;

function isSpace(ch) {
  return ch === ' ' || ch === '\t';
}

function lineEnd(source, pos) {
  const index = source.indexOf('\n', pos);
  return index === -1 ? source.length : index;
}

function defineHidden(target, name, value) {
  Object.defineProperty(target, name, { value, enumerable: false, writable: true });
}

function readHeredocMarker(source, start, heredocs, words) {
  let pos = start;
  let strip = false;
  if (source[pos] === '-') {
    strip = true;
    pos += 1;
  }
  while (isSpace(source[pos])) pos += 1;

  let delimiter = '';
  let quoted = false;
  const quote = source[pos];
  if (quote === "'" || quote === '"') {
    quoted = true;
    const close = source.indexOf(quote, pos + 1);
    const end = close === -1 ? source.length : close;
    delimiter = source.slice(pos + 1, end);
    pos = end + 1;
  } else {
    while (pos < source.length && !/[\s;&|()<>]/.test(source[pos])) {
      if (source[pos] === '\\') {
        quoted = true;
        pos += 1;
        continue;
      }
      delimiter += source[pos];
      pos += 1;
    }
  }
  heredocs.push({ delimiter, strip, quoted, words });
  return pos;
}

function scanSubstitutions(text, depth, out) {
  let pos = 0;
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === '\\') {
      pos += 2;
    } else if (ch === '$' && text[pos + 1] === '(') {
      pos = scanNested(text, pos + 2, depth, out);
    } else if (ch === '`') {
      pos = readBackticks(text, pos + 1, depth, out);
    } else {
      pos += 1;
    }
  }
}

function skipHeredocs(source, start, heredocs, depth, out) {
  let pos = start;
  while (heredocs.length > 0) {
    const { delimiter, strip, quoted, words } = heredocs.shift();
    const body = [];
    while (pos < source.length) {
      const end = lineEnd(source, pos);
      const line = source.slice(pos, end);
      pos = Math.min(end + 1, source.length);
      if ((strip ? line.replace(/^\t+/, '') : line) === delimiter) break;
      body.push(line);
    }
    const text = body.join('\n');
    defineHidden(words, 'stdin', text);
    if (!quoted) scanSubstitutions(text, depth, out);
  }
  return pos;
}

function scanNested(source, start, depth, out) {
  scopeCounter += 1;
  scopeStack.push(scopeCounter);
  const end = scan(source, start, true, depth + 1, out);
  scopeStack.pop();
  return end;
}

function readBackticks(source, start, depth, out) {
  const close = source.indexOf('`', start);
  const end = close === -1 ? source.length : close;
  scopeCounter += 1;
  scopeStack.push(scopeCounter);
  scan(source.slice(start, end), 0, false, depth + 1, out);
  scopeStack.pop();
  return end + 1;
}

function readDoubleQuoted(source, start, depth, out) {
  let pos = start;
  let text = '';
  while (pos < source.length) {
    const ch = source[pos];
    if (ch === '"') return { text, pos: pos + 1 };
    if (ch === '\\') {
      const next = source[pos + 1];
      if (next === '"' || next === '\\' || next === '$' || next === '`') {
        text += next;
        pos += 2;
      } else {
        text += ch;
        pos += 1;
      }
    } else if (ch === '$' && source[pos + 1] === '(') {
      text += SUBSTITUTION_MARK;
      pos = scanNested(source, pos + 2, depth, out);
    } else if (ch === '`') {
      text += SUBSTITUTION_MARK;
      pos = readBackticks(source, pos + 1, depth, out);
    } else {
      text += ch;
      pos += 1;
    }
  }
  return { text, pos };
}

function readAnsiCQuoted(source, start) {
  let pos = start;
  let text = '';
  while (pos < source.length && source[pos] !== "'") {
    if (source[pos] === '\\') {
      text += source[pos + 1] ?? '';
      pos += 2;
    } else {
      text += source[pos];
      pos += 1;
    }
  }
  return { text, pos: pos + 1 };
}

function skipRedirection(source, start) {
  let pos = start + 1;
  if (source[pos] === source[start]) pos += 1;
  if (source[pos] === '&') {
    pos += 1;
    while (/[\d-]/.test(source[pos] ?? '')) pos += 1;
    return { pos, discardNext: false };
  }
  return { pos, discardNext: true };
}

function scan(source, start, stopAtParen, depth, out) {
  if (depth > MAX_DEPTH) return source.length;

  let pos = start;
  let words = [];
  let word = '';
  let inWord = false;
  let awaitingHereString = false;
  let discardNext = false;
  let opened = 0;
  const heredocs = [];

  const endWord = () => {
    if (!inWord) return;
    if (discardNext) {
      discardNext = false;
    } else if (awaitingHereString) {
      defineHidden(words, 'stdin', word);
      awaitingHereString = false;
    } else {
      words.push(word);
    }
    word = '';
    inWord = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) {
      defineHidden(words, 'scopes', [...scopeStack]);
      out.push(words);
      words = [];
    }
  };

  while (pos < source.length) {
    const ch = source[pos];
    if (ch === '\n') {
      endSegment();
      pos = skipHeredocs(source, pos + 1, heredocs, depth, out);
    } else if (isSpace(ch)) {
      endWord();
      pos += 1;
    } else if (ch === '#' && !inWord) {
      pos = lineEnd(source, pos);
    } else if (ch === '\\') {
      word += source[pos + 1] ?? '';
      inWord = true;
      pos += 2;
    } else if (ch === "'") {
      const close = source.indexOf("'", pos + 1);
      const end = close === -1 ? source.length : close;
      word += source.slice(pos + 1, end);
      inWord = true;
      pos = end + 1;
    } else if (ch === '$' && source[pos + 1] === "'") {
      const quoted = readAnsiCQuoted(source, pos + 2);
      word += quoted.text;
      inWord = true;
      pos = quoted.pos;
    } else if (ch === '"') {
      const quoted = readDoubleQuoted(source, pos + 1, depth, out);
      word += quoted.text;
      inWord = true;
      pos = quoted.pos;
    } else if (ch === '`') {
      word += SUBSTITUTION_MARK;
      inWord = true;
      pos = readBackticks(source, pos + 1, depth, out);
    } else if (ch === '$' && source[pos + 1] === '(') {
      word += SUBSTITUTION_MARK;
      inWord = true;
      pos = scanNested(source, pos + 2, depth, out);
    } else if (ch === ')') {
      endSegment();
      pos += 1;
      if (opened > 0) {
        opened -= 1;
        scopeStack.pop();
      } else if (stopAtParen) {
        return pos;
      }
    } else if (ch === '(') {
      endSegment();
      scopeCounter += 1;
      scopeStack.push(scopeCounter);
      opened += 1;
      pos += 1;
    } else if (ch === '&' || ch === '|' || ch === ';') {
      endSegment();
      pos += source[pos + 1] === ch && ch !== ';' ? 2 : 1;
    } else if (ch === '<' && source.startsWith('<<<', pos)) {
      endWord();
      awaitingHereString = true;
      pos += 3;
    } else if (ch === '<' && source[pos + 1] === '<') {
      endWord();
      pos = readHeredocMarker(source, pos + 2, heredocs, words);
    } else if (ch === '<' || ch === '>') {
      if (inWord && /^\d+$/.test(word)) {
        word = '';
        inWord = false;
      } else {
        endWord();
      }
      const skipped = skipRedirection(source, pos);
      pos = skipped.pos;
      discardNext = skipped.discardNext;
    } else {
      word += ch;
      inWord = true;
      pos += 1;
    }
  }
  endSegment();
  while (opened > 0) {
    opened -= 1;
    scopeStack.pop();
  }
  return pos;
}

function programName(word) {
  const last = String(word).split(/[\\/]/).pop() ?? '';
  return last.toLowerCase().replace(/\.(exe|cmd|bat)$/, '');
}

function commandIndex(words) {
  let index = 0;
  while (index < words.length) {
    const word = words[index];
    if (ENV_ASSIGNMENT.test(word)) {
      index += 1;
      continue;
    }
    if (!PREFIX_WORDS.has(word)) return index;

    const spec = WRAPPER_OPTIONS.get(word);
    index += 1;
    while (index < words.length && words[index].startsWith('-')) {
      index += spec && spec.values.has(words[index]) ? 2 : 1;
    }
    index += spec ? spec.skip : 0;
  }
  return -1;
}

function splitStringPayloads(words, depth) {
  if (!words.includes('env')) return [];
  return words.flatMap((word, i) => {
    if (word === '-S' || word === '--split-string') return parseCommand(words[i + 1] ?? '', depth + 1);
    if (/^-S.+/.test(word)) return parseCommand(word.slice(2), depth + 1);
    return [];
  });
}

function expandWrapper(words, depth) {
  const envPayloads = splitStringPayloads(words, depth);
  const index = commandIndex(words);
  if (index === -1) return envPayloads;
  const program = programName(words[index]);
  const rest = words.slice(index + 1);

  if (SHELLS.has(program)) {
    const flag = rest.findIndex((word) => /^-[A-Za-z]*c[A-Za-z]*$/.test(word));
    if (flag !== -1) {
      const payload = rest[flag + 1] === '--' ? rest[flag + 2] : rest[flag + 1];
      return [...envPayloads, ...(payload !== undefined ? parseCommand(payload, depth + 1) : [])];
    }
    const stdin = typeof words.stdin === 'string' ? parseCommand(words.stdin, depth + 1) : [];
    return [...envPayloads, ...stdin];
  }
  if (program === 'eval') return [...envPayloads, ...parseCommand(rest.join(' '), depth + 1)];
  return envPayloads;
}

function parseCommand(command, depth = 0) {
  if (typeof command !== 'string' || depth > MAX_DEPTH) return [];
  const source = command.slice(0, MAX_LENGTH).replace(/\\\r?\n/g, ' ').replace(/\r/g, '');
  const segments = [];
  const savedScopes = scopeStack;
  scopeStack = [];
  try {
    scan(source, 0, false, depth, segments);
  } finally {
    scopeStack = savedScopes;
  }
  return [...segments, ...segments.flatMap((words) => expandWrapper(words, depth))];
}

function parseGit(words) {
  const start = commandIndex(words);
  if (start === -1 || programName(words[start]) !== 'git') return null;

  const dirs = [];
  const gitArgs = [];
  let index = start + 1;
  while (index < words.length && words[index].startsWith('-')) {
    const word = words[index];
    if (word === '-C') {
      dirs.push(words[index + 1] ?? '');
      index += 2;
    } else if (word.startsWith('-C')) {
      dirs.push(word.slice(2));
      index += 1;
    } else if (word === '-c') {
      index += 2;
    } else if (GIT_OPTIONS_WITH_VALUE.has(word)) {
      gitArgs.push(word, words[index + 1] ?? '');
      index += 2;
    } else {
      if (word.startsWith('--git-dir=') || word.startsWith('--work-tree=')) gitArgs.push(word);
      index += 1;
    }
  }
  return { dirs, gitArgs, subcommand: words[index], args: words.slice(index + 1) };
}

function isDynamicPath(value) {
  return /[$`]/.test(value);
}

function toNativePath(value) {
  let result = value;
  if (result === '~' || result.startsWith('~/')) result = path.join(os.homedir(), result.slice(1));
  if (process.platform !== 'win32') return result;
  const match = /^\/([a-zA-Z])(?:\/(.*))?$/.exec(result);
  return match ? `${match[1].toUpperCase()}:/${match[2] ?? ''}` : result;
}

function resolveDir(base, dirs) {
  return dirs
    .filter((dir) => !isDynamicPath(dir))
    .reduce((cwd, dir) => path.resolve(cwd, toNativePath(dir)), base);
}

function readInput(raw) {
  try {
    const input = JSON.parse(raw || '{}');
    return input && typeof input === 'object' ? input : {};
  } catch {
    return {};
  }
}

function readCommand(raw) {
  const input = readInput(raw);
  const command = input.tool_input && input.tool_input.command;
  return typeof command === 'string' ? command : '';
}

function readCwd(raw) {
  const cwd = readInput(raw).cwd;
  return typeof cwd === 'string' && cwd !== '' ? cwd : null;
}

function readStdin(onDone) {
  let raw = '';
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => onDone(raw));
}

function runHook(main) {
  readStdin((raw) => {
    let code = 0;
    try {
      code = main(raw);
    } catch (error) {
      process.stderr.write(`[harness] 훅 실행 중 오류가 났습니다: ${error.message}\n`);
      code = 1;
    }
    process.exit(code);
  });
}

module.exports = {
  SUBSTITUTION_MARK,
  commandIndex,
  isDynamicPath,
  parseCommand,
  parseGit,
  programName,
  readCommand,
  readCwd,
  readStdin,
  resolveDir,
  runHook,
  toNativePath,
};
