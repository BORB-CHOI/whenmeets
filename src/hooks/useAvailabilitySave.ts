'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Availability } from '@/lib/types';

interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantToken: string | null;
}

export function useAvailabilitySave({
  eventId,
  participantId,
  participantToken,
}: UseAvailabilitySaveOptions) {
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAvailabilityRef = useRef<Availability | null>(null);

  const doSave = useCallback(
    async (avail: Availability) => {
      if (!participantId || !participantToken) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Participant-Token': participantToken,
          },
          body: JSON.stringify({ availability: avail }),
        });
        if (!res.ok) {
          console.error('Save failed:', res.status);
          return; // Keep pending data so flushPending can retry on tab close
        }
        pendingAvailabilityRef.current = null;
      } catch (err) {
        console.error('Save error:', err);
      } finally {
        setSaving(false);
      }
    },
    [eventId, participantId, participantToken],
  );

  const saveAvailability = useCallback(
    (newAvailability: Availability) => {
      if (!participantId || !participantToken) return;
      pendingAvailabilityRef.current = newAvailability;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => doSave(newAvailability), 500);
    },
    [participantId, participantToken, doSave],
  );

  // Flush pending save via sendBeacon (works for tab close AND React unmount/navigation)
  const flushPending = useCallback(() => {
    if (pendingAvailabilityRef.current && participantId && participantToken) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      navigator.sendBeacon(
        `/api/events/${eventId}/participants/${participantId}`,
        new Blob(
          [JSON.stringify({ availability: pendingAvailabilityRef.current, token: participantToken })],
          { type: 'application/json' },
        ),
      );
      pendingAvailabilityRef.current = null;
    }
  }, [eventId, participantId, participantToken]);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPending);
    return () => {
      window.removeEventListener('beforeunload', flushPending);
      // Also flush on unmount (React navigation)
      flushPending();
    };
  }, [flushPending]);

  return { saving, saveAvailability };
}
