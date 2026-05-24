import { apiClient } from './client';

export interface Folder {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export const foldersApi = {
  list: () => apiClient.get<{ folders: Folder[] }>('/api/folders'),

  create: (name: string) =>
    apiClient.post<{ folder: Folder }>('/api/folders', { name }),

  rename: (id: string, name: string) =>
    apiClient.patch<{ ok: true }>(`/api/folders/${id}`, { name }),

  remove: (id: string) =>
    apiClient.delete<{ ok: true }>(`/api/folders/${id}`),

  reorder: (order: { key: string; position: number }[]) =>
    apiClient.patch<{ ok: true }>('/api/folders/reorder', { order }),

  assignEvent: (eventId: string, folderId: string | null) =>
    apiClient.patch<{ ok: true }>(`/api/events/${eventId}/folder`, {
      folder_id: folderId,
    }),

  reorderEvents: (
    updates: { event_id: string; folder_id: string | null; position: number }[],
  ) => apiClient.patch<{ ok: true }>('/api/events/reorder', { updates }),
};
