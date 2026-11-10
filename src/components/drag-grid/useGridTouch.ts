'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface GridTouchOptions {
  container: HTMLElement | null;
  disabled?: boolean;
  onStart: (x: number, y: number) => boolean;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onCancel: () => void;
}

export default function useGridTouch({ container, disabled = false, onStart, onMove, onEnd, onCancel }: GridTouchOptions) {
  const callbacks = useRef({ onStart, onMove, onEnd, onCancel });
  const lastTouchEndAt = useRef(0);

  useLayoutEffect(() => {
    callbacks.current = { onStart, onMove, onEnd, onCancel };
  }, [onStart, onMove, onEnd, onCancel]);

  useEffect(() => {
    if (!container || disabled) return;
    let activeId: number | null = null;
    let frame = 0;

    function cancel() {
      cancelAnimationFrame(frame);
      if (activeId === null) return;
      activeId = null;
      lastTouchEndAt.current = Date.now();
      callbacks.current.onCancel();
    }

    function start(event: TouchEvent) {
      if (event.touches.length !== 1) { cancel(); return; }
      if (activeId !== null || !event.cancelable) return;
      const touch = event.touches[0];
      if (!callbacks.current.onStart(touch.clientX, touch.clientY)) return;
      activeId = touch.identifier;
      event.preventDefault();
    }

    function move(event: TouchEvent) {
      if (activeId === null) return;
      if (event.touches.length !== 1 || !event.cancelable) { cancel(); return; }
      const touch = Array.from(event.touches).find((item) => item.identifier === activeId);
      if (!touch) return;
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => callbacks.current.onMove(touch.clientX, touch.clientY));
    }

    function end(event: TouchEvent) {
      lastTouchEndAt.current = Date.now();
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === activeId);
      if (!touch) return;
      activeId = null;
      cancelAnimationFrame(frame);
      callbacks.current.onEnd(touch.clientX, touch.clientY);
    }

    function cancelTouch(event: TouchEvent) {
      lastTouchEndAt.current = Date.now();
      if (event.changedTouches.length === 0 || Array.from(event.changedTouches).some((touch) => touch.identifier === activeId)) cancel();
    }

    function checkAdditionalTouches(event: TouchEvent) {
      if (event.touches.length > 1) cancel();
    }

    container.addEventListener('touchstart', start, { passive: false });
    container.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchstart', checkAdditionalTouches, { passive: true, capture: true });
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', cancelTouch, { passive: true });
    return () => {
      container.removeEventListener('touchstart', start);
      container.removeEventListener('touchmove', move);
      window.removeEventListener('touchstart', checkAdditionalTouches, true);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', cancelTouch);
      cancel();
    };
  }, [container, disabled]);

  return useCallback(() => Date.now() - lastTouchEndAt.current < 500, []);
}
