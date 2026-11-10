import { describe, expect, it } from 'vitest';
import { browserMeasurementSchema, measurementContextSchema, normalizeMeasurementPath, sanitizeAcquisition } from '@/lib/measurement';

describe('전환 계측 데이터 경계', () => {
  it('분석 경로에서 이벤트 접근 키와 인증 쿼리를 제거한다', () => {
    expect(normalizeMeasurementPath('/e/private-event-id')).toBe('/e/event');
    expect(normalizeMeasurementPath('/auth/callback?code=secret')).toBe('/auth/callback');
    expect(normalizeMeasurementPath('/use-cases/team-meeting')).toBe('/use-cases/team-meeting');
  });

  it('유입에서는 허용된 캠페인 값과 외부 호스트만 남긴다', () => {
    expect(sanitizeAcquisition('https://daymeet.org/?utm_source=chatgpt&utm_medium=cpc&email=person@example.com', 'https://example.com/private?token=secret')).toEqual({ source: 'chatgpt', medium: 'cpc', referrer_host: 'example.com' });
    expect(sanitizeAcquisition('https://daymeet.org/?utm_source=person%40example.com', '')).toEqual({});
  });

  it('브라우저가 서버 확정 전환을 신고하거나 임의 개인정보를 추가할 수 없다', () => {
    expect(browserMeasurementSchema.safeParse({ name: 'event_created' }).success).toBe(false);
    expect(browserMeasurementSchema.safeParse({ name: 'event_link_copied', properties: { title: '개인 모임' } }).success).toBe(false);
    expect(browserMeasurementSchema.safeParse({ name: 'event_link_copied', properties: { entry_point: 'event_page' } }).success).toBe(true);
  });

  it('동의가 없는 광고 식별 문맥과 과도한 입력은 거부한다', () => {
    expect(measurementContextSchema.safeParse({ consent: false, oppref: 'ref' }).success).toBe(false);
    expect(measurementContextSchema.safeParse({ consent: true, oppref: 'x'.repeat(2000) }).success).toBe(false);
  });
});
