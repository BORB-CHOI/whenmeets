import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { eventsRepo } from '@/server/repositories/events.repo';
import { participantsRepo } from '@/server/repositories/participants.repo';
import { profilesRepo } from '@/server/repositories/profiles.repo';
import { NotFoundError } from '@/server/http/errors';
import { authService } from './auth.service';
import type { AuthContext } from '@/server/http/auth-context';
import type { CreateEventInput, EventDetail, UpdateEventInput } from '@/types/event';

export const eventsService = {
  async create(input: CreateEventInput, auth: AuthContext): Promise<{ id: string }> {
    const id = nanoid(10);
    const start = input.time_start ?? 36;
    const end = input.time_end ?? 84;
    const mode = input.mode === 'unavailable' ? 'unavailable' : 'available';

    const row: Record<string, unknown> = {
      id,
      title: input.title.trim(),
      dates: input.dates,
      time_start: start,
      time_end: end,
      mode,
      date_only: input.date_only === true,
      start_on_monday: input.start_on_monday === true,
    };

    if (auth.userId) {
      row.created_by = auth.userId;
    }
    if (input.password) {
      row.password_hash = await bcrypt.hash(input.password, 10);
    }

    await eventsRepo.insert(row);
    return { id };
  },

  async getDetail(id: string, auth: AuthContext): Promise<EventDetail> {
    const event = await eventsRepo.findById(id);
    if (!event) throw new NotFoundError('이벤트');

    const hasPassword = !!event.password_hash;
    if (hasPassword && !auth.hasEventToken(id)) {
      return {
        id: event.id,
        title: event.title,
        has_password: true,
        requires_auth: true,
      };
    }

    const participants = await participantsRepo.findByEventId(id);
    const userIds = Array.from(
      new Set(participants.map((p) => p.user_id).filter((v): v is string => !!v)),
    );
    const avatarMap = await profilesRepo.findAvatarsByUserIds(userIds);

    const enriched = participants.map((p) => ({
      id: p.id,
      name: p.name,
      availability: p.availability,
      created_at: p.created_at,
      avatar_url: p.user_id ? avatarMap.get(p.user_id) ?? null : null,
    }));

    return {
      id: event.id,
      title: event.title,
      dates: event.dates,
      time_start: event.time_start,
      time_end: event.time_end,
      has_password: hasPassword,
      created_at: event.created_at,
      mode: event.mode,
      date_only: event.date_only,
      description: event.description ?? undefined,
      participants: enriched,
      is_owner: !!(event.created_by && auth.userId === event.created_by),
    };
  },

  async update(id: string, input: UpdateEventInput, auth: AuthContext): Promise<void> {
    await authService.requireEventOwner(id, auth);

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.dates !== undefined) patch.dates = input.dates;
    if (input.time_start !== undefined) patch.time_start = input.time_start;
    if (input.time_end !== undefined) patch.time_end = input.time_end;
    if (input.mode !== undefined) {
      patch.mode = input.mode === 'unavailable' ? 'unavailable' : 'available';
    }
    if (input.date_only !== undefined) patch.date_only = input.date_only;
    if (input.description !== undefined) patch.description = input.description;

    await eventsRepo.update(id, patch);
  },

  async softDelete(id: string, auth: AuthContext): Promise<void> {
    authService.requireUser(auth);
    await authService.requireEventOwner(id, auth);
    await eventsRepo.softDelete(id);
  },

  async listActiveIds(ids: string[]): Promise<{ activeIds: string[] }> {
    const filtered = ids.filter((v) => typeof v === 'string').slice(0, 100);
    const activeIds = await eventsRepo.findActiveIds(filtered);
    return { activeIds };
  },
};
