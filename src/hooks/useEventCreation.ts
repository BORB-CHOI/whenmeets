'use client';

import { useCallback, useRef } from 'react';
import { eventsApi } from '@/lib/api-client';
import type { CreateEventInput } from '@/types/event';
import { trackConversions } from '@/lib/measurement-client';
import type { ConversionReceipt, MeasurementProperties } from '@/lib/measurement';

export function useEventCreation() {
  const requestId = useRef<string | null>(null);
  const pending = useRef<Promise<{ id: string; conversions?: ConversionReceipt[] }> | null>(null);
  const resetCreation = useCallback(() => { requestId.current = null; }, []);

  const createEvent = useCallback((input: CreateEventInput, properties: MeasurementProperties = {}) => {
    if (pending.current) return pending.current;
    requestId.current ??= crypto.randomUUID();
    const metadata = { event_mode: input.mode ?? 'available', date_only: input.date_only ?? false, date_selection_mode: input.dates.some((date) => !/^\d{4}-/.test(date)) ? 'days_of_week' as const : 'calendar' as const, ...properties };
    const request = eventsApi.create({ ...input, request_id: requestId.current }, metadata).then((result) => {
      trackConversions(result.conversions, metadata);
      return result;
    });
    pending.current = request;
    void request.finally(() => { pending.current = null; }).catch(() => undefined);
    return request;
  }, []);

  return { createEvent, resetCreation };
}
