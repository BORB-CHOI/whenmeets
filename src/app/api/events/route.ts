import { withApiHandler } from '@/server/http/api-handler';
import { created } from '@/server/http/response';
import { getAuthContext } from '@/server/http/auth-context';
import { eventsService } from '@/server/services/events.service';
import { createEventSchema } from '@/server/validators/event.schema';
import type { z } from 'zod';
import { after } from 'next/server';
import { collectConversions, flushConversions, measurementEnabled } from '@/server/measurement/service';

type CreateBody = z.infer<typeof createEventSchema>;

export const maxDuration = 60;

export const POST = withApiHandler<unknown, CreateBody>(
  { bodySchema: createEventSchema },
  async ({ req, body }) => {
    const startedAt = Date.now();
    const auth = await getAuthContext(req);
    const result = await eventsService.create(body, auth);
    const conversions = await collectConversions(req, result.id, 'event_created', startedAt);
    if (measurementEnabled()) after(flushConversions);
    return created({ ...result, ...(conversions.length && { conversions }) });
  },
);
