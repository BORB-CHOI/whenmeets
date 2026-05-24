import { withApiHandler } from '@/server/http/api-handler';
import { ok } from '@/server/http/response';
import { eventsService } from '@/server/services/events.service';
import { activeEventsSchema } from '@/server/validators/event.schema';
import type { z } from 'zod';

type Body = z.infer<typeof activeEventsSchema>;

export const POST = withApiHandler<unknown, Body>(
  { bodySchema: activeEventsSchema },
  async ({ body }) => {
    const ids = body.ids ?? [];
    const result = await eventsService.listActiveIds(ids);
    return ok(result);
  },
);
