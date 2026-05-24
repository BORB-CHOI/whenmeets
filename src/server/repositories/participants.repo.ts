import { createServerClient } from '@/lib/supabase/server';
import type { Availability } from '@/lib/types';

export interface ParticipantRow {
  id: string;
  event_id: string;
  name: string;
  availability: Availability;
  created_at: string;
  user_id: string | null;
  password_hash: string | null;
}

export const participantsRepo = {
  async findByEventId(eventId: string): Promise<Pick<ParticipantRow, 'id' | 'name' | 'availability' | 'created_at' | 'user_id'>[]> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id, name, availability, created_at, user_id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    return (data ?? []) as Pick<ParticipantRow, 'id' | 'name' | 'availability' | 'created_at' | 'user_id'>[];
  },

  async findByEventIdForResults(eventId: string): Promise<Pick<ParticipantRow, 'id' | 'name' | 'availability' | 'user_id'>[]> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id, name, availability, user_id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    return (data ?? []) as Pick<ParticipantRow, 'id' | 'name' | 'availability' | 'user_id'>[];
  },

  async findById(id: string, eventId: string): Promise<Pick<ParticipantRow, 'id' | 'user_id' | 'password_hash'> | null> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id, user_id, password_hash')
      .eq('id', id)
      .eq('event_id', eventId)
      .single();
    return (data ?? null) as Pick<ParticipantRow, 'id' | 'user_id' | 'password_hash'> | null;
  },

  async findOwnByUser(eventId: string, userId: string): Promise<Pick<ParticipantRow, 'id' | 'name'> | null> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id, name')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    return (data ?? null) as Pick<ParticipantRow, 'id' | 'name'> | null;
  },

  async findByName(eventId: string, name: string): Promise<Pick<ParticipantRow, 'id' | 'name' | 'password_hash' | 'user_id'> | null> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id, name, password_hash, user_id')
      .eq('event_id', eventId)
      .ilike('name', name)
      .maybeSingle();
    return (data ?? null) as Pick<ParticipantRow, 'id' | 'name' | 'password_hash' | 'user_id'> | null;
  },

  async insert(row: Record<string, unknown>): Promise<{ id: string; name: string }> {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('participants')
      .insert(row)
      .select('id, name')
      .single();
    if (error) {
      const err = new Error(error.message) as Error & { code?: string };
      err.code = error.code;
      throw err;
    }
    return { id: data!.id as string, name: data!.name as string };
  },

  async updateAvailability(id: string, availability: Availability): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('participants')
      .update({ availability })
      .eq('id', id);
    if (error) {
      throw new Error(`participants.updateAvailability failed: ${error.message}`);
    }
  },

  async remove(id: string, eventId: string): Promise<void> {
    const sb = createServerClient();
    const { error } = await sb
      .from('participants')
      .delete()
      .eq('id', id)
      .eq('event_id', eventId);
    if (error) {
      throw new Error(`participants.remove failed: ${error.message}`);
    }
  },

  async existsForUserInEvent(eventId: string, userId: string): Promise<boolean> {
    const sb = createServerClient();
    const { data } = await sb
      .from('participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  },
};
