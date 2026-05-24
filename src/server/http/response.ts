import { NextResponse } from 'next/server';
import type { ApiResponse, ApiMeta } from '@/types/api';
import { ApiError } from './errors';

export function ok<T>(data: T, meta?: ApiMeta, status = 200): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return ok(data, undefined, 201);
}

export function fail(error: ApiError): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    },
    { status: error.status },
  );
}
