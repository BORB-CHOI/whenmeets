import { describe, it, expect } from 'vitest';
import { signEventToken, verifyEventToken } from '../auth';

describe('signEventToken', () => {
  it('returns a hex string', () => {
    const token = signEventToken('test-event-id');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns same token for same event id', () => {
    const t1 = signEventToken('abc');
    const t2 = signEventToken('abc');
    expect(t1).toBe(t2);
  });

  it('returns different tokens for different event ids', () => {
    const t1 = signEventToken('event-1');
    const t2 = signEventToken('event-2');
    expect(t1).not.toBe(t2);
  });
});

describe('verifyEventToken', () => {
  it('verifies a valid token', () => {
    const token = signEventToken('my-event');
    expect(verifyEventToken('my-event', token)).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(verifyEventToken('my-event', 'wrong-token')).toBe(false);
  });

  it('rejects a token for a different event', () => {
    const token = signEventToken('event-a');
    expect(verifyEventToken('event-b', token)).toBe(false);
  });

  it('rejects the static string "verified"', () => {
    expect(verifyEventToken('any-event', 'verified')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(verifyEventToken('event', '')).toBe(false);
  });
});
