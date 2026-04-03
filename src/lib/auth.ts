import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('COOKIE_SECRET 환경변수가 설정되지 않았습니다');
    }
    return 'dev-fallback-secret-change-me';
  }
  return secret;
}

/** Create HMAC-signed cookie value for event auth */
export function signEventToken(eventId: string): string {
  const hmac = createHmac('sha256', getSecret());
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
