import bcrypt from 'bcryptjs';
import { eventsRepo } from '@/server/repositories/events.repo';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/server/http/errors';
import { signEventToken } from '@/lib/auth';

export const eventAuthService = {
  /**
   * Verify the password for a password-protected event and return a signed
   * token cookie payload on success.
   */
  async verifyPassword(eventId: string, password: string): Promise<{ cookieValue: string }> {
    if (!password) {
      throw new ValidationError('비밀번호가 필요합니다');
    }
    const event = await eventsRepo.findOwnerById(eventId);
    if (!event || !event.password_hash) {
      throw new NotFoundError('이벤트');
    }
    const valid = await bcrypt.compare(password, event.password_hash);
    if (!valid) {
      throw new UnauthorizedError('비밀번호가 일치하지 않습니다');
    }
    return { cookieValue: signEventToken(eventId) };
  },
};
