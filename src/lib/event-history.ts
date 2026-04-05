const STORAGE_KEY = 'whenmeets:event-history';

export interface EventHistoryItem {
  id: string;
  title: string;
  dates: string[];
  role: 'creator' | 'participant';
  participantCount?: number;
  lastVisited: string; // ISO date
}

export function getEventHistory(): EventHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEventToHistory(item: EventHistoryItem) {
  const history = getEventHistory().filter((h) => h.id !== item.id);
  history.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
}

export function removeEventFromHistory(id: string) {
  const history = getEventHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
