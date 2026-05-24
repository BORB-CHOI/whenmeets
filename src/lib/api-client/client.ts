import type { ApiResponse, ApiErrorBody } from '@/types/api';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiClientError';
  }

  get code(): string {
    return this.body.code;
  }

  get details(): Record<string, unknown> | undefined {
    return this.body.details;
  }
}

interface FetchOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  keepalive?: boolean;
}

async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: FetchOptions = {},
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    ...(options.signal && { signal: options.signal }),
    ...(options.keepalive && { keepalive: options.keepalive }),
  };

  const res = await fetch(path, init);

  let parsed: ApiResponse<T> | null = null;
  try {
    parsed = (await res.json()) as ApiResponse<T>;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    throw new ApiClientError(res.status, {
      code: 'INTERNAL_ERROR',
      message: '서버 응답을 읽지 못했습니다',
    });
  }

  if (!parsed.success) {
    throw new ApiClientError(res.status, parsed.error);
  }

  return parsed.data;
}

export const apiClient = {
  get: <T>(path: string, options?: FetchOptions) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>('DELETE', path, body, options),
};
