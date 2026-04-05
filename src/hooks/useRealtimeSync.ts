'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Subscribe to realtime participant changes for an event.
 * Calls `onUpdate` whenever a change is detected.
 * Only active when `enabled` is true.
 */
export function useRealtimeSync(
  eventId: string,
  enabled: boolean,
  onUpdate: () => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        onUpdate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // onUpdate is intentionally excluded — callers should use a stable ref or useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, eventId]);
}
