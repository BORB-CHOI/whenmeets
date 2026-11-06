import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const LIB_PATH = fileURLToPath(
  new URL('../../.claude/scripts/hooks/lib/command.js', import.meta.url),
);

const { commandIndex, parseCommand, programName, readCommand } = createRequire(import.meta.url)(
  LIB_PATH,
);

const has = (segments: string[][], ...words: string[]) =>
  segments.some((segment) => words.every((word, i) => segment[i] === word));

describe('parseCommand: 분리', () => {
  it('단어 하나짜리 명령은 세그먼트 하나다', () => {
    expect(parseCommand('git status')).toEqual([['git', 'status']]);
  });

  it('&&, ||, ;, |, &, 줄바꿈으로 세그먼트를 나눈다', () => {
    expect(parseCommand('a && b || c ; d | e & f\ng')).toEqual([
      ['a'],
      ['b'],
      ['c'],
      ['d'],
      ['e'],
      ['f'],
      ['g'],
    ]);
  });

  it('괄호로 묶은 하위 셸도 세그먼트로 나눈다', () => {
    expect(parseCommand('(git commit -m x)')).toEqual([['git', 'commit', '-m', 'x']]);
  });

  it('탭도 공백으로 본다', () => {
    expect(parseCommand('git\tstatus')).toEqual([['git', 'status']]);
  });

  it('빈 문자열과 문자열이 아닌 입력은 빈 목록이다', () => {
    expect(parseCommand('')).toEqual([]);
    expect(parseCommand(123)).toEqual([]);
    expect(parseCommand(null)).toEqual([]);
    expect(parseCommand(['git', 'status'])).toEqual([]);
  });
});

describe('parseCommand: 따옴표와 이스케이프', () => {
  it('큰따옴표 안의 연산자는 분리하지 않는다', () => {
    expect(parseCommand('git commit -m "fix: a && b"')).toEqual([
      ['git', 'commit', '-m', 'fix: a && b'],
    ]);
  });

  it('작은따옴표 안의 내용은 그대로 둔다', () => {
    expect(parseCommand("echo 'a \"b\" $(c)'")).toEqual([['echo', 'a "b" $(c)']]);
  });

  it('큰따옴표 안의 이스케이프된 따옴표를 다룬다', () => {
    expect(parseCommand('echo "a \\" b"')).toEqual([['echo', 'a " b']]);
  });

  it('따옴표를 벗겨 인자를 돌려준다', () => {
    expect(parseCommand('git push origin "HEAD:main"')).toEqual([
      ['git', 'push', 'origin', 'HEAD:main'],
    ]);
    expect(parseCommand("git push origin 'main'")).toEqual([['git', 'push', 'origin', 'main']]);
  });

  it('공백이 든 따옴표 인자를 한 단어로 묶는다', () => {
    expect(parseCommand('git -C "my dir" commit')).toEqual([['git', '-C', 'my dir', 'commit']]);
  });

  it('따옴표로 감싼 명령어와 역슬래시가 붙은 명령어를 풀어 준다', () => {
    expect(parseCommand('"git" commit')).toEqual([['git', 'commit']]);
    expect(parseCommand('\\git status')).toEqual([['git', 'status']]);
  });

  it('작은따옴표와 큰따옴표가 섞여도 순서에 휘둘리지 않는다', () => {
    const segments = parseCommand('echo \'a"\'; git reset --hard; echo \'"\'');

    expect(has(segments, 'git', 'reset', '--hard')).toBe(true);
  });

  it("$'...' ANSI-C 따옴표 안의 이스케이프된 작은따옴표에서 닫히지 않는다", () => {
    const segments = parseCommand("git commit -m $'don\\'t' && git push origin main");

    expect(has(segments, 'git', 'push', 'origin', 'main')).toBe(true);
    expect(has(segments, 'git', 'commit', '-m', "don't")).toBe(true);
  });

  it('빈 따옴표도 빈 단어로 남긴다', () => {
    expect(parseCommand('echo ""')).toEqual([['echo', '']]);
  });

  it('닫히지 않은 따옴표에서도 예외 없이 끝난다', () => {
    expect(() => parseCommand('git commit -m "abc')).not.toThrow();
    expect(() => parseCommand("echo 'abc")).not.toThrow();
  });
});

describe('parseCommand: 줄 이음, 주석, heredoc', () => {
  it('줄 끝 역슬래시 이음을 공백으로 합친다', () => {
    expect(parseCommand('git push \\\n  origin main')).toEqual([['git', 'push', 'origin', 'main']]);
    expect(parseCommand('git push\\\n --force')).toEqual([['git', 'push', '--force']]);
  });

  it('CRLF 줄바꿈과 이음도 처리한다', () => {
    expect(parseCommand('git push \\\r\n origin main\r\ngit status')).toEqual([
      ['git', 'push', 'origin', 'main'],
      ['git', 'status'],
    ]);
  });

  it('단어 첫머리의 #부터 줄 끝까지는 주석이다', () => {
    expect(parseCommand('supabase db push # --dry-run')).toEqual([['supabase', 'db', 'push']]);
  });

  it('단어 중간의 #는 주석이 아니다', () => {
    expect(parseCommand('echo a#b')).toEqual([['echo', 'a#b']]);
  });

  it.each([
    "cat <<'EOF'\ngit push origin main\nEOF\ngit status",
    'cat <<EOF\ngit push origin main\nEOF\ngit status',
    'cat <<"EOF"\ngit push origin main\nEOF\ngit status',
    'cat <<-EOF\n\tgit push origin main\n\tEOF\ngit status',
  ])('heredoc 본문은 명령으로 보지 않는다: %j', (command) => {
    const segments = parseCommand(command);

    expect(has(segments, 'git', 'push')).toBe(false);
    expect(has(segments, 'git', 'status')).toBe(true);
  });

  it('끝나지 않은 heredoc은 끝까지 본문으로 본다', () => {
    expect(() => parseCommand("cat <<'EOF'\ngit push origin main")).not.toThrow();
    expect(has(parseCommand("cat <<'EOF'\ngit push origin main"), 'git', 'push')).toBe(false);
  });

  it('here-string(<<<)은 heredoc으로 보지 않는다', () => {
    expect(has(parseCommand('cat <<< hello\ngit status'), 'git', 'status')).toBe(true);
  });
});

describe('parseCommand: 중첩 명령', () => {
  it('커밋 메시지용 heredoc 치환 안의 본문은 명령으로 보지 않는다', () => {
    const command = 'git commit -m "$(cat <<\'EOF\'\ngit push origin main\n(괄호) 본문\nEOF\n)"';
    const segments = parseCommand(command);

    expect(has(segments, 'git', 'push')).toBe(false);
    expect(has(segments, 'git', 'commit')).toBe(true);
  });

  it('큰따옴표 안의 $(...) 치환 명령을 꺼낸다', () => {
    expect(has(parseCommand('echo "$(git reset --hard)"'), 'git', 'reset', '--hard')).toBe(true);
  });

  it('따옴표 없는 $(...) 치환 명령을 꺼낸다', () => {
    expect(has(parseCommand('echo $(git push origin main)'), 'git', 'push')).toBe(true);
  });

  it('백틱 치환 명령을 꺼낸다', () => {
    expect(has(parseCommand('echo `git reset --hard`'), 'git', 'reset')).toBe(true);
  });

  it('따옴표 없는 구분자의 heredoc 본문 안 치환 명령은 셸이 실행하므로 꺼낸다', () => {
    expect(has(parseCommand('cat <<EOF\n$(git reset --hard)\nEOF'), 'git', 'reset', '--hard')).toBe(true);
    expect(has(parseCommand('cat <<EOF\n`git reset --hard`\nEOF'), 'git', 'reset', '--hard')).toBe(true);
  });

  it('따옴표 친 구분자의 heredoc 본문은 치환되지 않으므로 꺼내지 않는다', () => {
    expect(has(parseCommand("cat <<'EOF'\n$(git reset --hard)\nEOF"), 'git', 'reset')).toBe(false);
    expect(has(parseCommand('cat <<"EOF"\n$(git reset --hard)\nEOF'), 'git', 'reset')).toBe(false);
  });

  it('이스케이프된 치환은 꺼내지 않는다', () => {
    expect(has(parseCommand('cat <<EOF\n\\$(git reset --hard)\nEOF'), 'git', 'reset')).toBe(false);
  });

  it.each([
    "bash <<'EOF'\ngit reset --hard\nEOF",
    'sh -s <<EOF\ngit reset --hard\nEOF',
    'bash <<< "git reset --hard"',
    "bash -c -- 'git reset --hard'",
    "bash -lc -- 'git reset --hard'",
  ])('셸에 스크립트를 넘기는 %j 안의 명령을 꺼낸다', (command) => {
    expect(has(parseCommand(command), 'git', 'reset', '--hard')).toBe(true);
  });

  it('셸이 아닌 명령에 넘긴 heredoc 본문은 명령으로 보지 않는다', () => {
    expect(has(parseCommand('cat <<EOF\ngit reset --hard\nEOF'), 'git', 'reset')).toBe(false);
    expect(has(parseCommand('cat <<< "git reset --hard"'), 'git', 'reset')).toBe(false);
  });

  it('치환이 든 단어에는 결과를 알 수 없다는 $() 표지를 남긴다', () => {
    expect(parseCommand('git push origin $(echo main)')).toContainEqual([
      'git',
      'push',
      'origin',
      '$()',
    ]);
    expect(parseCommand('echo "a $(date) b"')).toContainEqual(['echo', 'a $() b']);
    expect(parseCommand('echo `date`')).toContainEqual(['echo', '$()']);
  });

  it('작은따옴표 안의 $(...)는 치환이 아니다', () => {
    expect(has(parseCommand("echo '$(git reset --hard)'"), 'git', 'reset')).toBe(false);
  });

  it.each([
    "bash -c 'git reset --hard'",
    'sh -c "git reset --hard"',
    "bash -lc 'cd x && git reset --hard'",
    'zsh -c "git reset --hard"',
    'eval "git reset --hard"',
    'eval git reset --hard',
  ])('셸 -c 와 eval 안의 명령을 꺼낸다: %s', (command) => {
    expect(has(parseCommand(command), 'git', 'reset', '--hard')).toBe(true);
  });

  it('중첩이 깊어도 예외 없이 끝난다', () => {
    const deep = `${'bash -c "'.repeat(8)}git status${'"'.repeat(8)}`;

    expect(() => parseCommand(deep)).not.toThrow();
    expect(() => parseCommand('$('.repeat(200))).not.toThrow();
  });

  it('산술 확장 $((...)) 에서도 예외 없이 끝난다', () => {
    expect(() => parseCommand('echo $((1+2)) && git status')).not.toThrow();
  });

  it('아주 긴 입력도 예외 없이 끝난다', () => {
    expect(() => parseCommand(`git commit -m "${'a'.repeat(500000)}"`)).not.toThrow();
  });
});

describe('commandIndex', () => {
  it.each([
    [['git', 'status'], 0],
    [['FOO=1', 'git', 'status'], 1],
    [['FOO=1', 'BAR=2', 'git'], 2],
    [['sudo', 'git', 'status'], 1],
    [['command', 'git', 'status'], 1],
    [['{', 'git', 'status'], 1],
    [['if', 'git', 'status'], 1],
    [['time', 'nohup', 'git'], 2],
    [['time', '-p', 'git'], 2],
    [['xargs', '-n', '1', 'git', 'branch', '-D'], 3],
    [['xargs', '-r', 'git'], 2],
    [['xargs', '-I', '{}', 'git'], 3],
    [['env', '-u', 'FOO', 'git'], 3],
    [['env', '-i', 'FOO=1', 'git'], 3],
    [['sudo', '-u', 'root', 'git'], 3],
    [['nice', '-n', '10', 'git'], 3],
    [['timeout', '30', 'git'], 2],
    [['timeout', '-s', 'KILL', '30', 'git'], 4],
    [['exec', '-a', 'name', 'git'], 3],
    [[], -1],
    [['FOO=1'], -1],
  ])('%j 의 명령어 위치는 %i 다', (words, expected) => {
    expect(commandIndex(words)).toBe(expected);
  });
});

describe('programName', () => {
  it.each([
    ['git', 'git'],
    ['GIT', 'git'],
    ['git.exe', 'git'],
    ['/usr/bin/git', 'git'],
    ['C:\\Program Files\\Git\\bin\\git.exe', 'git'],
    ['./node_modules/.bin/supabase.cmd', 'supabase'],
    ['', ''],
  ])('%s 는 %s 다', (word, expected) => {
    expect(programName(word)).toBe(expected);
  });
});

describe('readCommand', () => {
  it('문자열이 아닌 command 는 빈 문자열이다', () => {
    expect(readCommand(JSON.stringify({ tool_input: { command: 5 } }))).toBe('');
    expect(readCommand(JSON.stringify({ tool_input: { command: ['git'] } }))).toBe('');
  });

  it('올바른 입력에서 command 를 읽는다', () => {
    expect(readCommand(JSON.stringify({ tool_input: { command: 'git status' } }))).toBe('git status');
  });
});
