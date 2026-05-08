export type InAppBrowserType =
  | 'kakaotalk'
  | 'naver'
  | 'line'
  | 'instagram'
  | 'facebook'
  | null;

export function detectInAppBrowser(ua?: string): InAppBrowserType {
  const userAgent =
    ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  if (!userAgent) return null;
  const lower = userAgent.toLowerCase();

  if (lower.includes('kakaotalk')) return 'kakaotalk';
  if (lower.includes('naver(inapp') || lower.includes('naver/inapp')) return 'naver';
  if (lower.includes('line/')) return 'line';
  if (lower.includes('instagram')) return 'instagram';
  if (lower.includes('fban') || lower.includes('fbav')) return 'facebook';
  return null;
}

export function openInExternalBrowser(currentUrl: string, type: InAppBrowserType): boolean {
  if (typeof window === 'undefined') return false;

  if (type === 'kakaotalk') {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    return true;
  }

  if (type === 'naver') {
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      return true;
    }
  }

  return false;
}

export function inAppBrowserLabel(type: InAppBrowserType): string {
  switch (type) {
    case 'kakaotalk':
      return '카카오톡';
    case 'naver':
      return '네이버';
    case 'line':
      return '라인';
    case 'instagram':
      return '인스타그램';
    case 'facebook':
      return '페이스북';
    default:
      return '인앱';
  }
}
