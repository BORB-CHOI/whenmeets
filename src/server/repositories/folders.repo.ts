import { createServerClient } from '@/lib/supabase/server';

export interface FolderRow {
  id: string;
  user_id?: string;
  name: string;
  position: number;
  created_at: string;
}

export const foldersRepo = {
  async listByUser(userId: string): Promise<FolderRow[]> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('folders')
      .select('id, name, position, created_at')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      throw new Error(`folders.listByUser failed: ${error.message}`);
    }
    return (data ?? []) as FolderRow[];
  },

  async countByUser(userId: string): Promise<number> {
    const sb = createServerClient();
    const { count } = await sb
      .from('folders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count ?? 0;
  },

  async findOwner(id: string): Promise<{ user_id: string } | null> {
    const sb = createServerClient();
    const { data } = await sb
      .from('folders')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    return (data ?? null) as { user_id: string } | null;
  },

  async maxPosition(userId: string): Promise<number> {
    const sb = createServerClient();
    const { data } = await sb
      .from('folders')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((data?.position as number | undefined) ?? -1);
  },

  async insert(userId: string, name: string, position: number): Promise<FolderRow> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('folders')
      .insert({ user_id: userId, name, position })
      .select('id, name, position, created_at')
      .single();
    if (error) {
      const e = new Error(error.message) as Error & { code?: string };
      e.code = error.code;
      throw e;
    }
    return data as FolderRow;
  },

  async rename(id: string, name: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb.from('folders').update({ name }).eq('id', id);
    if (error) {
      const e = new Error(error.message) as Error & { code?: string };
      e.code = error.code;
      throw e;
    }
  },

  async remove(id: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb.from('folders').delete().eq('id', id);
    if (error) {
      throw new Error(`folders.remove failed: ${error.message}`);
    }
  },

  async updatePosition(id: string, userId: string, position: number): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('folders')
      .update({ position })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      throw new Error(`folders.updatePosition failed: ${error.message}`);
    }
  },

  async findOwnedIds(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const sb = createServerClient();
    const { data } = await sb
      .from('folders')
      .select('id')
      .eq('user_id', userId)
      .in('id', ids);
    return new Set((data ?? []).map((r) => r.id as string));
  },
};
