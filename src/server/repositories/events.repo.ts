import { createServerClient } from '@/lib/supabase/server';
import type { EventRow } from '@/types/event';

type EventColumns = keyof EventRow;
const FULL_COLUMNS: EventColumns[] = [
  'id',
  'title',
  'dates',
  'time_start',
  'time_end',
  'created_at',
  'password_hash',
  'mode',
  'date_only',
  'description',
  'created_by',
  'deleted_at',
];

export const eventsRepo = {
  async findById(id: string): Promise<EventRow | null> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('events')
      .select(FULL_COLUMNS.join(', '))
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !data) return null;
    return data as unknown as EventRow;
  },

  async findOwnerById(id: string): Promise<{ created_by: string | null; password_hash: string | null } | null> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('events')
      .select('created_by, password_hash')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !data) return null;
    return data as { created_by: string | null; password_hash: string | null };
  },

  async findForResults(id: string): Promise<Pick<EventRow, 'id' | 'title' | 'dates' | 'time_start' | 'time_end' | 'mode' | 'password_hash'> | null> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('events')
      .select('id, title, dates, time_start, time_end, mode, password_hash')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error || !data) return null;
    return data as Pick<EventRow, 'id' | 'title' | 'dates' | 'time_start' | 'time_end' | 'mode' | 'password_hash'>;
  },

  async insert(row: Record<string, unknown>): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb.from('events').insert(row);
    if (error) {
      throw new Error(`events.insert failed: ${error.message}`);
    }
  },

  async update(id: string, patch: Record<string, unknown>): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb.from('events').update(patch).eq('id', id);
    if (error) {
      throw new Error(`events.update failed: ${error.message}`);
    }
  },

  async softDelete(id: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw new Error(`events.softDelete failed: ${error.message}`);
    }
  },

  async findActiveIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const sb = createServerClient();
    const { data } = await sb
      .from('events')
      .select('id')
      .in('id', ids)
      .is('deleted_at', null);
    return (data ?? []).map((e) => e.id as string);
  },

  async findVisibleIdsForUser(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const sb = createServerClient();
    const [{ data: created }, { data: parts }] = await Promise.all([
      sb
        .from('events')
        .select('id')
        .eq('created_by', userId)
        .in('id', ids)
        .is('deleted_at', null),
      sb
        .from('participants')
        .select('event_id')
        .eq('user_id', userId)
        .in('event_id', ids),
    ]);
    const visible = new Set<string>();
    for (const r of (created ?? []) as { id: string }[]) visible.add(r.id);
    for (const r of (parts ?? []) as { event_id: string }[]) visible.add(r.event_id);
    return visible;
  },
};
