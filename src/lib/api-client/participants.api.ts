import { apiClient } from './client';
import type { Availability } from '@/lib/types';

export interface JoinResponse {
  id: string;
  name: string;
  existing: boolean;
  numbered?: boolean;
}

export const participantsApi = {
  join: (eventId: string, name: string, password?: string) =>
    apiClient.post<JoinResponse>(`/api/events/${eventId}/participants`, {
      name,
      ...(password !== undefined && { password }),
    }),

  updateAvailability: (
    eventId: string,
    participantId: string,
    availability: Availability,
    password?: string,
  ) =>
    apiClient.patch<{ ok: true }>(
      `/api/events/${eventId}/participants/${participantId}`,
      { availability, ...(password !== undefined && { password }) },
    ),

  remove: (eventId: string, participantId: string, password?: string) =>
    apiClient.delete<{ ok: true }>(
      `/api/events/${eventId}/participants/${participantId}`,
      password !== undefined ? { password } : undefined,
    ),
};

export const eventAuthApi = {
  verifyPassword: (eventId: string, password: string) =>
    apiClient.post<{ ok: true }>(`/api/events/${eventId}/verify`, { password }),
};

export const resultsApi = {
  getResults: (eventId: string) =>
    apiClient.get<{
      event: {
        id: string;
        title: string;
        dates: string[];
        time_start: number;
        time_end: number;
        mode: 'available' | 'unavailable';
      };
      participants: Array<{
        id: string;
        name: string;
        availability: Availability;
        user_id: string | null;
        avatar_url: string | null;
      }>;
    }>(`/api/events/${eventId}/results`),
};
