import { NextRequest } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { verifyEventToken } from '@/lib/auth';

export interface AuthContext {
  userId: string | null;
  hasEventToken: (eventId: string) => boolean;
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  return {
    userId,
    hasEventToken(eventId: string): boolean {
      const cookie = req.cookies.get(`daymeet_auth_${eventId}`);
      if (!cookie) return false;
      return verifyEventToken(eventId, cookie.value);
    },
  };
}
