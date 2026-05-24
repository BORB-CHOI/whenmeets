import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError, InternalError, ValidationError } from './errors';
import { fail } from './response';

interface HandlerContext<TParams, TBody> {
  req: NextRequest;
  params: TParams;
  body: TBody;
}

interface HandlerConfig<TParams, TBody> {
  paramsSchema?: ZodSchema<TParams>;
  bodySchema?: ZodSchema<TBody>;
}

type RouteContext = { params: Promise<Record<string, string>> } | undefined;

export function withApiHandler<TParams = unknown, TBody = unknown>(
  config: HandlerConfig<TParams, TBody>,
  handler: (ctx: HandlerContext<TParams, TBody>) => Promise<NextResponse> | NextResponse,
) {
  return async (req: NextRequest, routeCtx?: RouteContext): Promise<NextResponse> => {
    try {
      const rawParams = routeCtx?.params ? await routeCtx.params : {};
      const params = config.paramsSchema
        ? config.paramsSchema.parse(rawParams)
        : (rawParams as TParams);

      let body: TBody = undefined as TBody;
      if (config.bodySchema) {
        const raw = await req.json().catch(() => ({}));
        body = config.bodySchema.parse(raw);
      }

      return await handler({ req, params, body });
    } catch (err) {
      if (err instanceof ApiError) return fail(err);
      if (err instanceof ZodError) {
        return fail(
          new ValidationError('입력값이 올바르지 않습니다', {
            issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
          }),
        );
      }
      console.error('[api] unhandled error:', err);
      return fail(new InternalError());
    }
  };
}
