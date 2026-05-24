import { createServerClient } from '@/lib/supabase/server';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  no_folder_position?: number | null;
}

export const profilesRepo = {
  async findAvatarsByUserIds(userIds: string[]): Promise<Map<string, string | null>> {
    if (userIds.length === 0) return new Map();
    const sb = createServerClient();
    const { data } = await sb
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);
    const map = new Map<string, string | null>();
    for (const row of (data ?? []) as { id: string; avatar_url: string | null }[]) {
      map.set(row.id, row.avatar_url);
    }
    return map;
  },

  async findById(userId: string): Promise<ProfileRow | null> {
    const sb = createServerClient();
    const { data } = await sb
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    return (data ?? null) as ProfileRow | null;
  },

  async upsertDisplayName(userId: string, displayName: string): Promise<ProfileRow> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('profiles')
      .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
      .select('id, display_name, avatar_url')
      .single();
    if (error) {
      throw new Error(`profiles.upsertDisplayName failed: ${error.message}`);
    }
    return data as ProfileRow;
  },

  async upsertNoFolderPosition(userId: string, position: number): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('profiles')
      .upsert({ id: userId, no_folder_position: position }, { onConflict: 'id' });
    if (error) {
      throw new Error(`profiles.upsertNoFolderPosition failed: ${error.message}`);
    }
  },
};
