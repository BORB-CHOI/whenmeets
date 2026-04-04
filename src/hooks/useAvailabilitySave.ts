'use client';

import { useCallback, useState } from 'react';
import type { Availability } from '@/lib/types';

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
      await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ availability, password: participantPassword }),
      });
    } finally {
      setSaving(false);
    }
  }, [eventId, participantId, participantPassword]);

  return { saving, saveNow };
}
