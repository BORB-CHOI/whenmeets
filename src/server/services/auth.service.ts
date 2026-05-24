import { eventsRepo } from '@/server/repositories/events.repo';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/server/http/errors';
import type { AuthContext } from '@/server/http/auth-context';

export const authService = {
  /**
   * Throws if the current user does not own the event.
   * - Event must exist (else NotFoundError).
   * - Event must have a creator and it must match the caller (else ForbiddenError).
   *   Anonymous events without a creator cannot be edited by anyone.
   */
  async requireEventOwner(eventId: string, auth: AuthContext): Promise<void> {
    const event = await eventsRepo.findOwnerById(eventId);
    if (!event) throw new NotFoundError('이벤트');
    if (!event.created_by) throw new ForbiddenError();
    if (auth.userId !== event.created_by) throw new ForbiddenError();
  },

  /**
   * Throws if there is no authenticated user. Use as a gate on
   * routes that require login (folder/profile CRUD).
   */
  requireUser(auth: AuthContext): string {
    if (!auth.userId) throw new UnauthorizedError();
    return auth.userId;
  },
};
