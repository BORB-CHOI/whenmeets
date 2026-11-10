'use client';

import { useCallback, useRef, useState } from 'react';
import type { Availability } from '@/lib/types';
import { participantsApi } from '@/lib/api-client';
import { ApiClientError } from '@/lib/api-client/client';

interface UseAvailabilitySaveOptions {
  eventId: string;
  participantId: string | null;
  participantPassword: string | null;
}

export function useAvailabilitySave({ eventId, participantId, participantPassword }: UseAvailabilitySaveOptions) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const clearError = useCallback(() => setError(null), []);

  const saveNow = useCallback(async (
    availability: Availability,
    identity = { participantId, participantPassword },
  ) => {
    if (inFlight.current) return false;
    if (!identity.participantId) {
      setError('참여자 정보를 확인한 뒤 다시 저장해 주세요.');
      return false;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await participantsApi.updateAvailability(
        eventId,
        identity.participantId,
        availability,
        identity.participantPassword ?? undefined,
      );
      return true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : '저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [eventId, participantId, participantPassword]);

  return { saving, error, clearError, saveNow };
}
