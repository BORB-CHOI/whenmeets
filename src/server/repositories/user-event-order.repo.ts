import { createServerClient } from '@/lib/supabase/server';

export const userEventOrderRepo = {
  async upsertMany(rows: { user_id: string; event_id: string; position: number }[]): Promise<void> {
    if (rows.length === 0) return;
    const sb = createServerClient();
    const { error } = await sb
      .from('user_event_order')
      .upsert(rows, { onConflict: 'user_id,event_id' });
    if (error) {
      throw new Error(`user_event_order.upsertMany failed: ${error.message}`);
    }
  },
};
