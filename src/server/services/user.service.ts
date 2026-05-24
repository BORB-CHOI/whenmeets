import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { createServerClient } from '@/lib/supabase/server';
import { profilesRepo, type ProfileRow } from '@/server/repositories/profiles.repo';
import { authService } from './auth.service';
import { InternalError } from '@/server/http/errors';
import type { AuthContext } from '@/server/http/auth-context';

interface ParticipantSync {
  updated: number;
  skipped: number;
}

interface ProfileDto extends ProfileRow {
  id: string;
}

export const userService = {
  async getProfile(auth: AuthContext): Promise<ProfileDto> {
    const userId = authService.requireUser(auth);
    const existing = await profilesRepo.findById(userId);
    if (existing) {
      return existing as ProfileDto;
    }
    // Fall back to user_metadata avatar from auth (display_name not stored yet)
    const client = await createAuthServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    return {
      id: userId,
      display_name: null,
      avatar_url:
        (user?.user_metadata?.avatar_url as string | undefined) ?? null,
    };
  },

  async updateDisplayName(
    auth: AuthContext,
    displayName: string,
  ): Promise<{ profile: ProfileDto; participants: ParticipantSync | null }> {
    const userId = authService.requireUser(auth);
    let profile: ProfileDto;
    try {
      profile = (await profilesRepo.upsertDisplayName(userId, displayName)) as ProfileDto;
    } catch (err) {
      console.error('profile upsert failed:', err);
      throw new InternalError('프로필 저장에 실패했습니다');
    }

    // Best-effort participants.name sync. Errors are swallowed but reported in shape.
    let participants: ParticipantSync | null = null;
    try {
      const sb = createServerClient();
      const { data: rows } = await sb
        .from('participants')
        .select('id, name')
        .eq('user_id', userId);

      const targets = (rows ?? []).filter(
        (r: { id: string; name: string }) => r.name !== displayName,
      );
      let updated = 0;
      let skipped = 0;
      for (const row of targets as { id: string; name: string }[]) {
        const { error } = await sb
          .from('participants')
          .update({ name: displayName })
          .eq('id', row.id);
        if (error) {
          if (error.code === '23505') {
            skipped++;
            continue;
          }
          console.error('participants sync failed:', error.message);
          break;
        }
        updated++;
      }
      participants = { updated, skipped };
    } catch (e) {
      console.error('participants sync exception:', e);
    }

    return { profile, participants };
  },
};
