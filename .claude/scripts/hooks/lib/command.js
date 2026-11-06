const SUBSTITUTION_MARK = '$()';
const MAX_DEPTH = 4;
const MAX_LENGTH = 200000;
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
]);
const FLAG_TAKING_PREFIXES = new Set(['sudo', 'env', 'nice', 'time', 'nohup', 'command', 'exec']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const GIT_OPTIONS_WITH_VALUE = new Set([
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--super-prefix',
  '--config-env',
]);

function isSpace(ch) {
  return ch === ' ' || ch === '\t';
}

function lineEnd(source, pos) {
  const index = source.indexOf('\n', pos);
  return index === -1 ? source.length : index;
}

function readHeredocMarker(source, start, heredocs) {
  let pos = start;
  let strip = false;
  if (source[pos] === '-') {
    strip = true;
    pos += 1;
  }
  while (isSpace(source[pos])) pos += 1;

  let delimiter = '';
  const quote = source[pos];
  if (quote === "'" || quote === '"') {
    const close = source.indexOf(quote, pos + 1);
    const end = close === -1 ? source.length : close;
    delimiter = source.slice(pos + 1, end);
    pos = end + 1;
  } else {
    while (pos < source.length && !/[\s;&|()<>]/.test(source[pos])) {
      delimiter += source[pos];
      pos += 1;
    }
  }
  heredocs.push({ delimiter, strip });
  return pos;
}

function skipHeredocs(source, start, heredocs) {
  let pos = start;
  while (heredocs.length > 0) {
    const { delimiter, strip } = heredocs.shift();
    while (pos < source.length) {
      const end = lineEnd(source, pos);
      const line = source.slice(pos, end);
      pos = Math.min(end + 1, source.length);
      if ((strip ? line.replace(/^\t+/, '') : line) === delimiter) break;
    }
  }
  return pos;
}

function readBackticks(source, start, depth, out) {
  const close = source.indexOf('`', start);
  const end = close === -1 ? source.length : close;
  scan(source.slice(start, end), 0, false, depth + 1, out);
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
      pos = scan(source, pos + 2, true, depth + 1, out);
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

function scan(source, start, stopAtParen, depth, out) {
  if (depth > MAX_DEPTH) return source.length;

  let pos = start;
  let words = [];
  let word = '';
  let inWord = false;
  const heredocs = [];

  const endWord = () => {
    if (inWord) {
      words.push(word);
      word = '';
      inWord = false;
    }
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) {
      out.push(words);
      words = [];
    }
  };

  while (pos < source.length) {
    const ch = source[pos];
    if (ch === '\n') {
      endSegment();
      pos = skipHeredocs(source, pos + 1, heredocs);
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
      pos = scan(source, pos + 2, true, depth + 1, out);
    } else if (ch === ')') {
      endSegment();
      pos += 1;
      if (stopAtParen) return pos;
    } else if (ch === '(') {
      endSegment();
      pos += 1;
    } else if (ch === '&' || ch === '|' || ch === ';') {
      endSegment();
      pos += source[pos + 1] === ch && ch !== ';' ? 2 : 1;
    } else if (ch === '<' && source.startsWith('<<<', pos)) {
      word += '<<<';
      inWord = true;
      pos += 3;
    } else if (ch === '<' && source[pos + 1] === '<') {
      pos = readHeredocMarker(source, pos + 2, heredocs);
    } else {
      word += ch;
      inWord = true;
      pos += 1;
    }
  }
  endSegment();
  return pos;
}

function programName(word) {
  const last = String(word).split(/[\\/]/).pop() ?? '';
  return last.toLowerCase().replace(/\.(exe|cmd|bat)$/, '');
}

function commandIndex(words) {
  let index = 0;
  let afterPrefix = false;
  while (index < words.length) {
    const word = words[index];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word)) {
      afterPrefix = false;
    } else if (PREFIX_WORDS.has(word)) {
      afterPrefix = FLAG_TAKING_PREFIXES.has(word);
    } else if (afterPrefix && word.startsWith('-')) {
      afterPrefix = true;
    } else {
      return index;
    }
    index += 1;
  }
  return -1;
}

function expandWrapper(words, depth) {
  const index = commandIndex(words);
  if (index === -1) return [];
  const program = programName(words[index]);
  const rest = words.slice(index + 1);

  if (SHELLS.has(program)) {
    const flag = rest.findIndex((word) => /^-[A-Za-z]*c[A-Za-z]*$/.test(word));
    return flag !== -1 && rest[flag + 1] !== undefined
      ? parseCommand(rest[flag + 1], depth + 1)
      : [];
  }
  if (program === 'eval') return parseCommand(rest.join(' '), depth + 1);
  return [];
}

function parseCommand(command, depth = 0) {
  if (typeof command !== 'string' || depth > MAX_DEPTH) return [];
  const source = command.slice(0, MAX_LENGTH).replace(/\\\r?\n/g, ' ').replace(/\r/g, '');
  const segments = [];
  scan(source, 0, false, depth, segments);
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

function readCommand(raw) {
  let input;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    return '';
  }
  const command = input && input.tool_input && input.tool_input.command;
  return typeof command === 'string' ? command : '';
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
  commandIndex,
  parseCommand,
  parseGit,
  programName,
  readCommand,
  readStdin,
  runHook,
};
