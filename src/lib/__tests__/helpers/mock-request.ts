import { NextRequest } from 'next/server';

interface MockRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * Create a mock NextRequest for testing API route handlers.
 */
export function createMockRequest(
  url: string,
  options: MockRequestOptions = {},
): NextRequest {
  const { method = 'GET', body, headers = {}, cookies = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  // Build cookie header
  const cookieEntries = Object.entries(cookies);
  if (cookieEntries.length > 0) {
    const cookieHeader = cookieEntries.map(([k, v]) => `${k}=${v}`).join('; ');
    (init.headers as Record<string, string>)['cookie'] = cookieHeader;
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never);
}
