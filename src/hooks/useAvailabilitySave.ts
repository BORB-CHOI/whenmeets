'use client';

import { useCallback, useState } from 'react';
import type { Availability } from '@/lib/types';

interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantToken: string | null;
}

export function useAvailabilitySave({ eventId, participantId, participantToken }: UseAvailabilitySaveOptions) {
  const [saving, setSaving] = useState(false);

  const saveNow = useCallback(async (availability: Availability) => {
    if (!participantId || !participantToken) return;
    setSaving(true);
    try {
      await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': participantToken,
        },
        body: JSON.stringify({ availability }),
      });
    } finally {
      setSaving(false);
    }
  }, [eventId, participantId, participantToken]);

  return { saving, saveNow };
}
