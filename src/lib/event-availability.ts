import type { Availability, EventData } from '@/lib/types';

export function applySavedAvailability(
  event: EventData,
  participant: { id: string; name: string },
  availability: Availability,
): EventData {
  const existing = event.participants.some((p) => p.id === participant.id);
  const participants = existing
    ? event.participants.map((p) => p.id === participant.id ? { ...p, availability } : p)
    : [...event.participants, { ...participant, availability, created_at: new Date().toISOString() }];
  return { ...event, participants };
}
