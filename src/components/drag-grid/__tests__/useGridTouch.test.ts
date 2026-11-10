import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const effects = vi.hoisted(() => ({ cleanups: [] as (() => void)[] }));
vi.mock('react', () => ({
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useLayoutEffect: (effect: () => void) => effect(),
  useEffect: (effect: () => (() => void) | undefined) => {
    const cleanup = effect();
    if (cleanup) effects.cleanups.push(cleanup);
  },
}));

import useGridTouch from '../useGridTouch';

let root: EventTarget;
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
const point = (identifier = 1, clientX = 100, clientY = 200) => ({ identifier, clientX, clientY });
type Point = ReturnType<typeof point>;
function touchEvent(type: string, touches: Point[], changedTouches = touches, cancelable = true) {
  return Object.assign(new Event(type, { cancelable }), { touches, changedTouches });
}
function TouchHarness(accepted = true, disabled = false) {
  const callbacks = { onStart: vi.fn(() => accepted), onMove: vi.fn(), onEnd: vi.fn(), onCancel: vi.fn() };
  const ignoreMouse = useGridTouch({ container: root as HTMLElement, disabled, ...callbacks });
  return { ...callbacks, ignoreMouse };
}
function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(0));
}

beforeEach(() => {
  root = new EventTarget();
  frames = new Map();
  frameId = 0;
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => {
  effects.cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

describe('그리드 터치 소유권과 스크롤', () => {
  it('숫자·여백에서 시작하면 셀 쪽으로 움직여도 스크롤을 막거나 칠하지 않는다', () => {
    const hook = TouchHarness(false);
    const start = touchEvent('touchstart', [point()]);
    root.dispatchEvent(start);
    const move = touchEvent('touchmove', [point(1, 150, 260)]);
    root.dispatchEvent(move);
    flushFrames();
    window.dispatchEvent(touchEvent('touchend', [], [point()]));
    expect(start.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
    expect(hook.onMove).not.toHaveBeenCalled();
    expect(hook.onEnd).not.toHaveBeenCalled();
    expect(hook.ignoreMouse()).toBe(true);
  });

  it('셀에서 시작한 터치만 막고 마지막 이동과 동일한 손가락의 종료를 반영한다', () => {
    const hook = TouchHarness();
    const start = touchEvent('touchstart', [point()]);
    root.dispatchEvent(start);
    const move = touchEvent('touchmove', [point(1, 130, 240)]);
    root.dispatchEvent(move);
    root.dispatchEvent(touchEvent('touchmove', [point(1, 140, 250)]));
    expect(start.defaultPrevented).toBe(true);
    expect(move.defaultPrevented).toBe(true);
    flushFrames();
    expect(hook.onMove).toHaveBeenCalledTimes(1);
    expect(hook.onMove).toHaveBeenCalledWith(140, 250);
    window.dispatchEvent(touchEvent('touchend', [point()], [point(2)]));
    expect(hook.onEnd).not.toHaveBeenCalled();
    window.dispatchEvent(touchEvent('touchend', [], [point(1, 150, 270)]));
    expect(hook.onEnd).toHaveBeenCalledTimes(1);
    expect(hook.onEnd).toHaveBeenCalledWith(150, 270);
  });

  it('브라우저가 취소하면 대기 중인 칠하기를 취소하고 초안을 되돌린다', () => {
    const hook = TouchHarness();
    root.dispatchEvent(touchEvent('touchstart', [point()]));
    root.dispatchEvent(touchEvent('touchmove', [point(1, 130, 240)]));
    window.dispatchEvent(touchEvent('touchcancel', [], [point()]));
    flushFrames();
    expect(hook.onCancel).toHaveBeenCalledOnce();
    expect(hook.onMove).not.toHaveBeenCalled();
    expect(hook.onEnd).not.toHaveBeenCalled();
  });

  it('두 번째 손가락이 그리드 밖에서 시작해도 선택을 취소한다', () => {
    const hook = TouchHarness();
    root.dispatchEvent(touchEvent('touchstart', [point()]));
    window.dispatchEvent(touchEvent('touchstart', [point(), point(2)], [point(2)]));
    expect(hook.onCancel).toHaveBeenCalledOnce();
    root.dispatchEvent(touchEvent('touchmove', [point()]));
    flushFrames();
    expect(hook.onMove).not.toHaveBeenCalled();
  });

  it('취소할 수 없는 이벤트와 비활성 그리드는 선택을 시작하지 않는다', () => {
    const hook = TouchHarness();
    root.dispatchEvent(touchEvent('touchstart', [point()], [point()], false));
    expect(hook.onStart).not.toHaveBeenCalled();
    effects.cleanups.splice(0).forEach((cleanup) => cleanup());
    const disabled = TouchHarness(true, true);
    root.dispatchEvent(touchEvent('touchstart', [point()]));
    expect(disabled.onStart).not.toHaveBeenCalled();
  });

  it('진행 중 화면이 해제되면 선택과 예약된 작업을 정리한다', () => {
    const hook = TouchHarness();
    root.dispatchEvent(touchEvent('touchstart', [point()]));
    root.dispatchEvent(touchEvent('touchmove', [point(1, 130, 240)]));
    effects.cleanups.splice(0).forEach((cleanup) => cleanup());
    flushFrames();
    expect(hook.onCancel).toHaveBeenCalledOnce();
    expect(hook.onMove).not.toHaveBeenCalled();
    window.dispatchEvent(touchEvent('touchend', [], [point()]));
    expect(hook.onEnd).not.toHaveBeenCalled();
  });
});
