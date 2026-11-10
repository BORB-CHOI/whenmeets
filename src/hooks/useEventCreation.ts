'use client';

import { useCallback, useRef } from 'react';
import { eventsApi } from '@/lib/api-client';
import type { CreateEventInput } from '@/types/event';

export function useEventCreation() {
  const requestId = useRef<string | null>(null);
  const pending = useRef<Promise<{ id: string }> | null>(null);
  const resetCreation = useCallback(() => { requestId.current = null; }, []);

  const createEvent = useCallback((input: CreateEventInput) => {
    if (pending.current) return pending.current;
    requestId.current ??= crypto.randomUUID();
    const request = eventsApi.create({ ...input, request_id: requestId.current });
    pending.current = request;
    void request.finally(() => { pending.current = null; }).catch(() => undefined);
    return request;
  }, []);

  return { createEvent, resetCreation };
}
