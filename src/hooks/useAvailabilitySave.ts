'use client';

import { useCallback, useState } from 'react';
import type { Availability } from '@/lib/types';
import { participantsApi } from '@/lib/api-client';

interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantPassword: string | null;
}

export function useAvailabilitySave({ eventId, participantId, participantPassword }: UseAvailabilitySaveOptions) {
  const [saving, setSaving] = useState(false);

  const saveNow = useCallback(async (availability: Availability) => {
    if (!participantId) return;
    setSaving(true);
    try {
      await participantsApi.updateAvailability(
        eventId,
        participantId,
        availability,
        participantPassword ?? undefined,
      );
    } catch {
      // Best-effort save; UI surfaces errors elsewhere via fetch/useEvent invalidation.
    } finally {
      setSaving(false);
    }
  }, [eventId, participantId, participantPassword]);

  return { saving, saveNow };
}
