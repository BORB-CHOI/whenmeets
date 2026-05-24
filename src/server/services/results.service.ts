import { eventsRepo } from '@/server/repositories/events.repo';
import { participantsRepo } from '@/server/repositories/participants.repo';
import { profilesRepo } from '@/server/repositories/profiles.repo';
import {
  NotFoundError,
  UnauthorizedError,
} from '@/server/http/errors';
import type { AuthContext } from '@/server/http/auth-context';
import type { EventMode } from '@/lib/types';
import type { Availability } from '@/lib/types';

interface ResultsParticipant {
  id: string;
  name: string;
  availability: Availability;
  user_id: string | null;
  avatar_url: string | null;
}

interface ResultsResponse {
  event: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
    mode: EventMode;
  };
  participants: ResultsParticipant[];
}

export const resultsService = {
  async getResults(eventId: string, auth: AuthContext): Promise<ResultsResponse> {
    const event = await eventsRepo.findForResults(eventId);
    if (!event) throw new NotFoundError('이벤트');

    if (event.password_hash && !auth.hasEventToken(eventId)) {
      throw new UnauthorizedError('인증이 필요합니다');
    }

    const participants = await participantsRepo.findByEventIdForResults(eventId);
    const userIds = Array.from(
      new Set(participants.map((p) => p.user_id).filter((v): v is string => !!v)),
    );
    const avatarMap = await profilesRepo.findAvatarsByUserIds(userIds);

    return {
      event: {
        id: event.id,
        title: event.title,
        dates: event.dates,
        time_start: event.time_start,
        time_end: event.time_end,
        mode: event.mode,
      },
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        availability: p.availability,
        user_id: p.user_id,
        avatar_url: p.user_id ? avatarMap.get(p.user_id) ?? null : null,
      })),
    };
  },
};
