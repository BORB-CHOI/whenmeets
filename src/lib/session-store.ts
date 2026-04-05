/**
 * Multi-session localStorage store for anonymous participants.
 *
 * New structure: whenmeets:<eventId> → { sessions: [...], activeId }
 * Old structure: whenmeets:<eventId> → { participantId, name, password }
 *
 * On read, the old structure is auto-migrated to the new format.
 */

export interface ParticipantSession {
  pid: string;       // participant ID
  name: string;
  password: string | null;
}

interface SessionStore {
  sessions: ParticipantSession[];
  activeId: string | null;  // pid of active session
}

function storageKey(eventId: string) {
  return `whenmeets:${eventId}`;
}

/** Read the session store, auto-migrating from old format if needed. */
export function readSessionStore(eventId: string): SessionStore {
  if (typeof window === 'undefined') return { sessions: [], activeId: null };

  try {
    const raw = localStorage.getItem(storageKey(eventId));
    if (!raw) return { sessions: [], activeId: null };

    const parsed = JSON.parse(raw);

    // New format check
    if (Array.isArray(parsed.sessions)) {
      return parsed as SessionStore;
    }

    // Old format migration: { participantId, name, password } → new structure
    if (parsed.participantId) {
      const migrated: SessionStore = {
        sessions: [{
          pid: parsed.participantId,
          name: parsed.name ?? '',
          password: parsed.password ?? null,
        }],
        activeId: parsed.participantId,
      };
      localStorage.setItem(storageKey(eventId), JSON.stringify(migrated));
      return migrated;
    }

    return { sessions: [], activeId: null };
  } catch {
    try { localStorage.removeItem(storageKey(eventId)); } catch { /* SSR safe */ }
    return { sessions: [], activeId: null };
  }
}

/** Get the currently active session, or null. */
export function getActiveSession(eventId: string): ParticipantSession | null {
  const store = readSessionStore(eventId);
  if (!store.activeId) return null;
  return store.sessions.find((s) => s.pid === store.activeId) ?? null;
}

/** Get a session by participant ID. */
export function getSessionByPid(eventId: string, pid: string): ParticipantSession | null {
  const store = readSessionStore(eventId);
  return store.sessions.find((s) => s.pid === pid) ?? null;
}

/** Get a session by participant name. */
export function getSessionByName(eventId: string, name: string): ParticipantSession | null {
  const store = readSessionStore(eventId);
  return store.sessions.find((s) => s.name === name) ?? null;
}

/** Add or update a session and set it as active. */
export function upsertSession(eventId: string, session: ParticipantSession): void {
  const store = readSessionStore(eventId);
  const idx = store.sessions.findIndex((s) => s.pid === session.pid);
  if (idx >= 0) {
    store.sessions[idx] = session;
  } else {
    store.sessions.push(session);
  }
  store.activeId = session.pid;
  localStorage.setItem(storageKey(eventId), JSON.stringify(store));
}

/** Set the active session by participant ID. */
export function setActiveSession(eventId: string, pid: string): void {
  const store = readSessionStore(eventId);
  if (store.sessions.some((s) => s.pid === pid)) {
    store.activeId = pid;
    localStorage.setItem(storageKey(eventId), JSON.stringify(store));
  }
}

/** Get all sessions for an event. */
export function getAllSessions(eventId: string): ParticipantSession[] {
  return readSessionStore(eventId).sessions;
}
