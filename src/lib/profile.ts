import { createServerClient } from '@/lib/supabase/server';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('getProfileByUserId failed:', error.message);
    return null;
  }
  return data ?? null;
}

export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string | null; avatar_url?: string | null } | null;
}

export function pickDisplayName(profile: ProfileRow | null, user: AuthUserLike): string {
  return (
    profile?.display_name?.trim() ||
    (user.user_metadata?.full_name ?? '').trim() ||
    user.email?.split('@')[0] ||
    ''
  );
}

export function pickAvatarUrl(profile: ProfileRow | null, user: AuthUserLike): string | null {
  return profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;
}
