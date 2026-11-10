import type { Availability, EventData } from '@/lib/types';

type DraftEvent = Pick<EventData, 'id' | 'dates' | 'time_start' | 'time_end' | 'date_only' | 'mode'>;

function storageKey(eventId: string) {
  return `daymeet:edit-draft:${eventId}`;
}

function eventSignature(event: DraftEvent) {
  return JSON.stringify([[...event.dates].sort(), event.time_start, event.time_end, event.date_only, event.mode]);
}

export function saveEditDraft(event: DraftEvent, availability: Availability): boolean {
  try {
    sessionStorage.setItem(storageKey(event.id), JSON.stringify({
      signature: eventSignature(event), availability, savedAt: Date.now(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearEditDraft(eventId: string): void {
  try {
    sessionStorage.removeItem(storageKey(eventId));
  } catch {}
}

export function readEditDraft(event: DraftEvent): Availability | null {
  try {
    const raw = sessionStorage.getItem(storageKey(event.id));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft?.signature !== eventSignature(event) || typeof draft.savedAt !== 'number' ||
        Date.now() - draft.savedAt > 24 * 60 * 60 * 1000 || !draft.availability ||
        typeof draft.availability !== 'object' || Array.isArray(draft.availability)) {
      clearEditDraft(event.id);
      return null;
    }
    for (const [date, slots] of Object.entries(draft.availability)) {
      if (!event.dates.includes(date) || !slots || typeof slots !== 'object' || Array.isArray(slots)) return null;
      for (const [slot, level] of Object.entries(slots)) {
        const validSlot = event.date_only ? slot === 'all_day' :
          /^\d+$/.test(slot) && Number(slot) >= event.time_start && Number(slot) < event.time_end;
        if (!validSlot || (level !== 0 && level !== 1 && level !== 2)) return null;
      }
    }
    return draft.availability as Availability;
  } catch {
    clearEditDraft(event.id);
    return null;
  }
}
