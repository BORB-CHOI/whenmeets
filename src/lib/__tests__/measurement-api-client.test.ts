import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client/client';
import { getMeasurementHeaders } from '@/lib/measurement-client';

vi.mock('@/lib/measurement-client', () => ({ getMeasurementHeaders: vi.fn(() => ({ 'x-daymeet-measurement': 'context' })) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('API 측정 문맥 범위', () => {
  it('일반 조회·인증·변경 요청에서는 측정 저장소를 읽거나 헤더를 붙이지 않는다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ success: true, data: {} })));
    vi.stubGlobal('fetch', fetcher);
    await apiClient.get('/api/events/example');
    await apiClient.post('/api/events/example/verify', { password: 'example' });
    expect(getMeasurementHeaders).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.every((call) => !JSON.stringify(call[1]?.headers).includes('x-daymeet-measurement'))).toBe(true);
  });
});
