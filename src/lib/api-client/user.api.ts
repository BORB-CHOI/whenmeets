import { apiClient } from './client';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UpdateProfileResponse {
  profile: Profile;
  participants: { updated: number; skipped: number } | null;
}

export const userApi = {
  getProfile: () => apiClient.get<Profile>('/api/user/profile'),

  updateDisplayName: (displayName: string) =>
    apiClient.patch<UpdateProfileResponse>('/api/user/profile', {
      display_name: displayName,
    }),
};
