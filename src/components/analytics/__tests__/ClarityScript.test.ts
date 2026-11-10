import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClarityScript from '../ClarityScript';
import { runInNewContext } from 'node:vm';

beforeEach(() => { vi.stubGlobal('React', React); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Clarity 녹화 유지', () => {
  it.each(['true', 'false', undefined])('전환 계측 설정이 %s여도 기존 프로젝트의 녹화 로더를 유지한다', (enabled) => {
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', enabled);
    vi.stubEnv('NEXT_PUBLIC_CLARITY_PROJECT_ID', 'clarity123');
    const html = renderToStaticMarkup(React.createElement(ClarityScript));
    expect(html).toContain('https://www.clarity.ms/tag/');
    expect(html).toContain('clarity123');
    expect(html.match(/<script/g)).toHaveLength(1);
  });

  it('Clarity 프로젝트 ID가 없을 때만 로더를 생략한다', () => {
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_CLARITY_PROJECT_ID', '');
    expect(renderToStaticMarkup(React.createElement(ClarityScript))).toBe('');
  });

  it.each(['/e/example-event', '/'])('실제 화면 %s에서는 녹화 SDK를 시작한다', (pathname) => {
    vi.stubEnv('NEXT_PUBLIC_MEASUREMENT_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_CLARITY_PROJECT_ID', 'clarity123');
    const html = renderToStaticMarkup(React.createElement(ClarityScript));
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    const target: Record<string, unknown> = {}; target.parent = target;
    const insertBefore = vi.fn();
    const doc = { location: { pathname }, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore } }] };
    runInNewContext(script!, { window: target, document: doc });
    expect(insertBefore).toHaveBeenCalledTimes(1);
    expect(typeof target.clarity).toBe('function');
  });

  it('광고용 숨김 iframe을 별도의 사용자 녹화로 수집하지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_CLARITY_PROJECT_ID', 'clarity123');
    const html = renderToStaticMarkup(React.createElement(ClarityScript));
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    const target: Record<string, unknown> = { parent: {} };
    const createElement = vi.fn();
    runInNewContext(script!, { window: target, document: { location: { pathname: '/measurement' }, createElement } });
    expect(createElement).not.toHaveBeenCalled();
    expect(target.clarity).toBeUndefined();
  });
});
