'use client';

import { useCallback, useState } from 'react';
import { Availability, EventData } from '@/lib/types';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAvailabilitySave } from '@/hooks/useAvailabilitySave';
import PasswordForm from './PasswordForm';
import NameForm from './NameForm';
import GridEditor from './GridEditor';

type InitialState =
  | { type: 'password' }
  | { type: 'ready' };

interface EventPageClientProps {
  eventId: string;
  initialEvent: EventData;
  initialState: InitialState;
}

type PageState = 'password' | 'name' | 'grid';

/** Read stored session from localStorage (once) */
function readStoredSession(eventId: string) {
  try {
    const stored = localStorage.getItem(`whenmeets:${eventId}`);
    if (stored) return JSON.parse(stored) as { participantId: string; token: string };
  } catch {
    localStorage.removeItem(`whenmeets:${eventId}`);
  }
  return null;
}

export default function EventPageClient({
  eventId,
  initialEvent,
  initialState,
}: EventPageClientProps) {
  const [event, setEvent] = useState<EventData>(initialEvent);

  // Read localStorage once, derive all initial states from it
  const [session] = useState(() => {
    if (initialState.type === 'password') return null;
    const s = readStoredSession(eventId);
    if (s && initialEvent.participants.find((p) => p.id === s.participantId)) return s;
    return null;
  });

  const [state, setState] = useState<PageState>(() => {
    if (initialState.type === 'password') return 'password';
    return session ? 'grid' : 'name';
  });

  const [participantId, setParticipantId] = useState<string | null>(session?.participantId ?? null);
  const [participantToken, setParticipantToken] = useState<string | null>(session?.token ?? null);
  const [availability, setAvailability] = useState<Availability>(() => {
    if (!session) return {};
    const existing = initialEvent.participants.find((p) => p.id === session.participantId);
    return existing?.availability ?? {};
  });

  const { saving, saveAvailability } = useAvailabilitySave({
    eventId,
    participantId,
    participantToken,
  });

  const handleRealtimeUpdate = useCallback(() => {
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data: EventData) => {
        if (!data.requires_auth) setEvent(data);
      });
  }, [eventId]);

  useRealtimeSync(eventId, state === 'grid', handleRealtimeUpdate);

  function handlePasswordAuthenticated(data: EventData) {
    setEvent(data);
    const stored = readStoredSession(eventId);
    if (stored) {
      const existing = data.participants.find((p) => p.id === stored.participantId);
      if (existing) {
        setParticipantId(stored.participantId);
        setParticipantToken(stored.token);
        setAvailability(existing.availability);
        setState('grid');
        return;
      }
    }
    setState('name');
  }

  function handleJoined(data: { id: string; token: string; existing?: boolean }) {
    setParticipantId(data.id);
    setParticipantToken(data.token);
    localStorage.setItem(
      `whenmeets:${eventId}`,
      JSON.stringify({ participantId: data.id, token: data.token }),
    );
    if (data.existing) {
      const existingParticipant = event.participants.find((p) => p.id === data.id);
      if (existingParticipant) {
        setAvailability(existingParticipant.availability);
      }
    }
    setState('grid');
  }

  function handleAvailabilityChange(newAvailability: Availability) {
    setAvailability(newAvailability);
    saveAvailability(newAvailability);
  }

  if (state === 'password') {
    return (
      <PasswordForm
        event={event}
        eventId={eventId}
        onAuthenticated={handlePasswordAuthenticated}
      />
    );
  }

  if (state === 'name') {
    return (
      <NameForm
        event={event}
        eventId={eventId}
        onJoined={handleJoined}
      />
    );
  }

  return (
    <GridEditor
      eventId={eventId}
      title={event.title}
      dates={event.dates}
      timeStart={event.time_start}
      timeEnd={event.time_end}
      availability={availability}
      onAvailabilityChange={handleAvailabilityChange}
      saving={saving}
    />
  );
}
