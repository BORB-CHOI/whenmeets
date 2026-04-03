import { createHmac } from 'crypto';

const SECRET = process.env.COOKIE_SECRET || 'dev-fallback-secret-change-me';

/** Create HMAC-signed cookie value for event auth */
export function signEventToken(eventId: string): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update(eventId);
  return hmac.digest('hex');
}

/** Verify HMAC-signed cookie value */
export function verifyEventToken(eventId: string, token: string): boolean {
  const expected = signEventToken(eventId);
  if (expected.length !== token.length) return false;
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}
