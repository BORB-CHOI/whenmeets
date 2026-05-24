import bcrypt from 'bcryptjs';
import { participantsRepo } from '@/server/repositories/participants.repo';
import { eventsRepo } from '@/server/repositories/events.repo';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  InternalError,
} from '@/server/http/errors';
import type { AuthContext } from '@/server/http/auth-context';
import type { Availability } from '@/lib/types';

interface JoinResult {
  id: string;
  name: string;
  existing: boolean;
  numbered?: boolean;
}

async function insertWithNumberedName(
  baseInsert: Record<string, unknown>,
  baseName: string,
): Promise<{ id: string; name: string }> {
  for (let suffix = 2; suffix <= 50; suffix++) {
    const candidate = `${baseName} (${suffix})`;
    try {
      const inserted = await participantsRepo.insert({ ...baseInsert, name: candidate });
      return inserted;
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code !== '23505') {
        throw new InternalError('참여 등록에 실패했습니다');
      }
    }
  }
  throw new ConflictError('이름이 너무 많이 중복됩니다');
}

export const participantsService = {
  async join(
    eventId: string,
    name: string,
    password: string | undefined,
    auth: AuthContext,
  ): Promise<JoinResult> {
    const trimmedName = name.trim();

    const event = await eventsRepo.findOwnerById(eventId);
    if (!event) throw new NotFoundError('이벤트');

    if (event.password_hash && !auth.hasEventToken(eventId)) {
      throw new UnauthorizedError('인증이 필요합니다');
    }

    if (auth.userId) {
      const ownExisting = await participantsRepo.findOwnByUser(eventId, auth.userId);
      if (ownExisting) {
        return { id: ownExisting.id, name: ownExisting.name, existing: true };
      }
    }

    const existingByName = await participantsRepo.findByName(eventId, trimmedName);

    if (existingByName) {
      if (auth.userId) {
        const inserted = await insertWithNumberedName(
          {
            event_id: eventId,
            availability: {},
            password_hash: null,
            user_id: auth.userId,
          },
          trimmedName,
        );
        return { id: inserted.id, name: inserted.name, existing: false, numbered: true };
      }

      if (existingByName.user_id) {
        throw new ConflictError('이미 사용 중인 이름입니다');
      }

      if (existingByName.password_hash) {
        if (password && (await bcrypt.compare(password, existingByName.password_hash))) {
          return { id: existingByName.id, name: existingByName.name, existing: true };
        }
        throw new UnauthorizedError('비밀번호가 필요합니다', { requires_password: true });
      }

      return { id: existingByName.id, name: existingByName.name, existing: true };
    }

    const insertData: Record<string, unknown> = {
      event_id: eventId,
      name: trimmedName,
      availability: {},
      password_hash: password ? await bcrypt.hash(password, 10) : null,
    };
    if (auth.userId) {
      insertData.user_id = auth.userId;
    }

    try {
      const inserted = await participantsRepo.insert(insertData);
      return { id: inserted.id, name: inserted.name, existing: false };
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === '23505') {
        if (auth.userId) {
          const inserted = await insertWithNumberedName(
            {
              event_id: eventId,
              availability: {},
              password_hash: null,
              user_id: auth.userId,
            },
            trimmedName,
          );
          return { id: inserted.id, name: inserted.name, existing: false, numbered: true };
        }
        throw new ConflictError('이미 사용 중인 이름입니다');
      }
      throw new InternalError('참여 등록에 실패했습니다');
    }
  },

  async updateAvailability(
    eventId: string,
    pid: string,
    availability: Availability,
    password: string | undefined,
    auth: AuthContext,
  ): Promise<void> {
    const event = await eventsRepo.findOwnerById(eventId);
    if (!event) throw new NotFoundError('이벤트');

    const participant = await participantsRepo.findById(pid, eventId);
    if (!participant) throw new NotFoundError('참여자');

    if (participant.user_id) {
      if (auth.userId !== participant.user_id) throw new ForbiddenError();
    } else if (participant.password_hash) {
      if (!password || !(await bcrypt.compare(password, participant.password_hash))) {
        throw new UnauthorizedError('비밀번호가 일치하지 않습니다');
      }
    }

    await participantsRepo.updateAvailability(pid, availability);
  },

  async remove(
    eventId: string,
    pid: string,
    password: string | undefined,
    auth: AuthContext,
  ): Promise<void> {
    const event = await eventsRepo.findOwnerById(eventId);
    if (!event) throw new NotFoundError('이벤트');

    const participant = await participantsRepo.findById(pid, eventId);
    if (!participant) throw new NotFoundError('참여자');

    let authorized = false;

    if (participant.user_id) {
      if (auth.userId === participant.user_id) authorized = true;
    } else if (participant.password_hash) {
      if (password && (await bcrypt.compare(password, participant.password_hash))) {
        authorized = true;
      }
    } else {
      authorized = true;
    }

    if (!authorized && event.created_by && auth.userId === event.created_by) {
      authorized = true;
    }

    if (!authorized && event.password_hash) {
      if (auth.hasEventToken(eventId)) {
        authorized = true;
      }
    }

    if (!authorized) {
      if (!participant.user_id && participant.password_hash) {
        throw new UnauthorizedError('비밀번호가 필요합니다', { requires_password: true });
      }
      throw new ForbiddenError();
    }

    await participantsRepo.remove(pid, eventId);
  },
};
