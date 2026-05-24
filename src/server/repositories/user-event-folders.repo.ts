import { createServerClient } from '@/lib/supabase/server';

export const userEventFoldersRepo = {
  async upsert(userId: string, eventId: string, folderId: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('user_event_folders')
      .upsert(
        { user_id: userId, event_id: eventId, folder_id: folderId },
        { onConflict: 'user_id,event_id' },
      );
    if (error) {
      throw new Error(`user_event_folders.upsert failed: ${error.message}`);
    }
  },

  async removeForUserEvent(userId: string, eventId: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('user_event_folders')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) {
      throw new Error(`user_event_folders.removeForUserEvent failed: ${error.message}`);
    }
  },

  async upsertMany(rows: { user_id: string; event_id: string; folder_id: string }[]): Promise<void> {
    if (rows.length === 0) return;
    const sb = createServerClient();
    const { error } = await sb
      .from('user_event_folders')
      .upsert(rows, { onConflict: 'user_id,event_id' });
    if (error) {
      throw new Error(`user_event_folders.upsertMany failed: ${error.message}`);
    }
  },

  async removeManyForUser(userId: string, eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    const sb = createServerClient();
    const { error } = await sb
      .from('user_event_folders')
      .delete()
      .eq('user_id', userId)
      .in('event_id', eventIds);
    if (error) {
      throw new Error(`user_event_folders.removeManyForUser failed: ${error.message}`);
    }
  },
};
