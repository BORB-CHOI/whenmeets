import { apiClient } from './client';
import type {
  CreateEventInput,
  EventDetail,
  UpdateEventInput,
} from '@/types/event';

export const eventsApi = {
  create: (input: CreateEventInput) =>
    apiClient.post<{ id: string }>('/api/events', input),

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
