import type { ApiErrorCode } from '@/types/api';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = '잘못된 요청입니다', details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = '로그인이 필요합니다', details?: Record<string, unknown>) {
    super('UNAUTHORIZED', 401, message, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = '권한이 없습니다') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = '리소스') {
    super('NOT_FOUND', 404, `${resource}를 찾을 수 없습니다`);
  }
}

export class ConflictError extends ApiError {
  constructor(message = '충돌이 발생했습니다', details?: Record<string, unknown>) {
    super('CONFLICT', 409, message, details);
  }
}

export class InternalError extends ApiError {
  constructor(message = '서버 오류가 발생했습니다') {
    super('INTERNAL_ERROR', 500, message);
  }
}
