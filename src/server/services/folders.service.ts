import { foldersRepo, type FolderRow } from '@/server/repositories/folders.repo';
import { eventsRepo } from '@/server/repositories/events.repo';
import { participantsRepo } from '@/server/repositories/participants.repo';
import { userEventFoldersRepo } from '@/server/repositories/user-event-folders.repo';
import { userEventOrderRepo } from '@/server/repositories/user-event-order.repo';
import { profilesRepo } from '@/server/repositories/profiles.repo';
import { authService } from './auth.service';
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
} from '@/server/http/errors';
import type { AuthContext } from '@/server/http/auth-context';

const MAX_FOLDERS_PER_USER = 50;
const NO_FOLDER_KEY = '__no_folder__';

export const foldersService = {
  async list(auth: AuthContext): Promise<{ folders: FolderRow[] }> {
    const userId = authService.requireUser(auth);
    const folders = await foldersRepo.listByUser(userId);
    return { folders };
  },

  async create(auth: AuthContext, name: string): Promise<{ folder: FolderRow }> {
    const userId = authService.requireUser(auth);
    const count = await foldersRepo.countByUser(userId);
    if (count >= MAX_FOLDERS_PER_USER) {
      throw new ConflictError('폴더 개수 한도를 초과했습니다');
    }
    const nextPosition = (await foldersRepo.maxPosition(userId)) + 1;
    try {
      const folder = await foldersRepo.insert(userId, name, nextPosition);
      return { folder };
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === '23505') {
        throw new ConflictError('같은 이름의 폴더가 이미 있습니다');
      }
      throw new InternalError('폴더 생성에 실패했습니다');
    }
  },

  async rename(auth: AuthContext, folderId: string, name: string): Promise<void> {
    const userId = authService.requireUser(auth);
    const owner = await foldersRepo.findOwner(folderId);
    if (!owner || owner.user_id !== userId) {
      throw new ForbiddenError();
    }
    try {
      await foldersRepo.rename(folderId, name);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === '23505') {
        throw new ConflictError('같은 이름의 폴더가 이미 있습니다');
      }
      throw new InternalError('폴더 이름 변경에 실패했습니다');
    }
  },

  async remove(auth: AuthContext, folderId: string): Promise<void> {
    const userId = authService.requireUser(auth);
    const owner = await foldersRepo.findOwner(folderId);
    if (!owner || owner.user_id !== userId) {
      throw new ForbiddenError();
    }
    await foldersRepo.remove(folderId);
  },

  async assignEvent(
    auth: AuthContext,
    eventId: string,
    folderId: string | null,
  ): Promise<void> {
    const userId = authService.requireUser(auth);

    const event = await eventsRepo.findOwnerById(eventId);
    if (!event) throw new NotFoundError('이벤트');

    if (event.created_by !== userId) {
      const isParticipant = await participantsRepo.existsForUserInEvent(eventId, userId);
      if (!isParticipant) throw new ForbiddenError();
    }

    if (folderId === null) {
      await userEventFoldersRepo.removeForUserEvent(userId, eventId);
      return;
    }

    const owner = await foldersRepo.findOwner(folderId);
    if (!owner || owner.user_id !== userId) {
      throw new NotFoundError('폴더');
    }

    await userEventFoldersRepo.upsert(userId, eventId, folderId);
  },

  async reorder(
    auth: AuthContext,
    order: { key: string; position: number }[],
  ): Promise<void> {
    const userId = authService.requireUser(auth);

    const folderEntries = order.filter((e) => e.key !== NO_FOLDER_KEY);
    const noFolderEntry = order.find((e) => e.key === NO_FOLDER_KEY);
    const folderIds = folderEntries.map((e) => e.key);

    if (folderIds.length > 0) {
      const owned = await foldersRepo.findOwnedIds(userId, folderIds);
      if (owned.size !== folderIds.length) {
        throw new ForbiddenError();
      }
    }

    for (const entry of folderEntries) {
      await foldersRepo.updatePosition(entry.key, userId, entry.position);
    }

    if (noFolderEntry) {
      await profilesRepo.upsertNoFolderPosition(userId, noFolderEntry.position);
    }
  },
};

export const eventReorderService = {
  async reorder(
    auth: AuthContext,
    updates: { event_id: string; folder_id: string | null; position: number }[],
  ): Promise<void> {
    const userId = authService.requireUser(auth);

    const eventIds = Array.from(new Set(updates.map((u) => u.event_id)));

    const visible = await eventsRepo.findVisibleIdsForUser(userId, eventIds);
    for (const id of eventIds) {
      if (!visible.has(id)) throw new ForbiddenError();
    }

    const folderIds = Array.from(
      new Set(updates.map((u) => u.folder_id).filter((id): id is string => id !== null)),
    );
    if (folderIds.length > 0) {
      const owned = await foldersRepo.findOwnedIds(userId, folderIds);
      for (const fid of folderIds) {
        if (!owned.has(fid)) throw new ForbiddenError();
      }
    }

    const folderUpserts = updates
      .filter((u) => u.folder_id !== null)
      .map((u) => ({
        user_id: userId,
        event_id: u.event_id,
        folder_id: u.folder_id as string,
      }));
    if (folderUpserts.length > 0) {
      await userEventFoldersRepo.upsertMany(folderUpserts);
    }

    const folderDeletes = updates
      .filter((u) => u.folder_id === null)
      .map((u) => u.event_id);
    if (folderDeletes.length > 0) {
      await userEventFoldersRepo.removeManyForUser(userId, folderDeletes);
    }

    const orderUpserts = updates.map((u) => ({
      user_id: userId,
      event_id: u.event_id,
      position: u.position,
    }));
    await userEventOrderRepo.upsertMany(orderUpserts);
  },
};
