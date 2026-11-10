import { apiClient } from './client';
import type { ConversionReceipt, MeasurementProperties } from '@/lib/measurement';
import type {
  CreateEventInput,
  EventDetail,
  UpdateEventInput,
} from '@/types/event';

export const eventsApi = {
  create: (input: CreateEventInput, properties?: MeasurementProperties) =>
    apiClient.post<{ id: string; conversions?: ConversionReceipt[] }>('/api/events', input, { measurement: true, ...(properties && { headers: { 'x-daymeet-measurement-properties': encodeURIComponent(JSON.stringify(properties)) } }) }),

  getDetail: (eventId: string) =>
    apiClient.get<EventDetail>(`/api/events/${eventId}`),

  update: (eventId: string, input: UpdateEventInput) =>
    apiClient.patch<{ ok: true }>(`/api/events/${eventId}`, input),

  remove: (eventId: string) =>
    apiClient.delete<{ ok: true }>(`/api/events/${eventId}`),

  listActiveIds: (ids: string[], signal?: AbortSignal) =>
    apiClient.post<{ activeIds: string[] }>(
      '/api/events/active',
      { ids },
      { signal, keepalive: false },
    ),
};
