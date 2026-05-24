import { withApiHandler } from '@/server/http/api-handler';
import { created } from '@/server/http/response';
import { getAuthContext } from '@/server/http/auth-context';
import { eventsService } from '@/server/services/events.service';
import { createEventSchema } from '@/server/validators/event.schema';
import type { z } from 'zod';

type CreateBody = z.infer<typeof createEventSchema>;

export const POST = withApiHandler<unknown, CreateBody>(
  { bodySchema: createEventSchema },
  async ({ req, body }) => {
    const auth = await getAuthContext(req);
    const result = await eventsService.create(body, auth);
    return created(result);
  },
);
