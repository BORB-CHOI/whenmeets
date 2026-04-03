'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Availability, Event, Participant } from '@/lib/types';
import DragGrid from '@/components/drag-grid/DragGrid';
import { createBrowserClient } from '@/lib/supabase/client';

type PageState = 'loading' | 'password' | 'name' | 'grid' | 'error';

interface EventData extends Event {
  participants: Pick<Participant, 'id' | 'name' | 'availability' | 'created_at'>[];
  requires_auth?: boolean;
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [state, setState] = useState<PageState>('loading');
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>({});
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load event
  useEffect(() => {
    async function loadEvent() {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        setError('이벤트를 찾을 수 없습니다');
        setState('error');
        return;
      }
      const data: EventData = await res.json();
      if (data.requires_auth) {
        setState('password');
        setEvent(data);
        return;
      }
      setEvent(data);

      try {
        const stored = localStorage.getItem(`whenmeets:${eventId}`);
        if (stored) {
          const { participantId: pid, token } = JSON.parse(stored);
          const existing = data.participants.find((p) => p.id === pid);
          if (existing) {
            setParticipantId(pid);
            setParticipantToken(token);
            setAvailability(existing.availability);
            setState('grid');
            return;
          }
        }
      } catch {
        localStorage.removeItem(`whenmeets:${eventId}`);
      }
      setState('name');
    }
    loadEvent();
  }, [eventId]);

  // Realtime subscription
  useEffect(() => {
    if (state !== 'grid') return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetch(`/api/events/${eventId}`)
            .then((res) => res.json())
            .then((data) => {
              if (!data.requires_auth) setEvent(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state, eventId]);

  // Password submit
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/events/${eventId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError('비밀번호가 틀렸습니다');
      return;
    }
    setError('');
    const eventRes = await fetch(`/api/events/${eventId}`);
    const data: EventData = await eventRes.json();
    setEvent(data);

    try {
      const stored = localStorage.getItem(`whenmeets:${eventId}`);
      if (stored) {
        const { participantId: pid, token } = JSON.parse(stored);
        const existing = data.participants.find((p) => p.id === pid);
        if (existing) {
          setParticipantId(pid);
          setParticipantToken(token);
          setAvailability(existing.availability);
          setState('grid');
          return;
        }
      }
    } catch {
      localStorage.removeItem(`whenmeets:${eventId}`);
    }
    setState('name');
  }

  // Name submit
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Send stored token if available (for reclaiming existing name)
    let storedToken: string | null = null;
    try {
      const stored = localStorage.getItem(`whenmeets:${eventId}`);
      if (stored) storedToken = JSON.parse(stored).token;
    } catch { /* corrupted localStorage */ }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (storedToken) headers['X-Participant-Token'] = storedToken;

    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) {
      const errData = await res.json();
      setError(errData.error || '참여에 실패했습니다');
      return;
    }

    const data = await res.json();
    setParticipantId(data.id);
    setParticipantToken(data.token);

    localStorage.setItem(
      `whenmeets:${eventId}`,
      JSON.stringify({ participantId: data.id, token: data.token })
    );

    if (data.existing) {
      const existingParticipant = event?.participants.find((p) => p.id === data.id);
      if (existingParticipant) {
        setAvailability(existingParticipant.availability);
      }
    }

    setState('grid');
  }

  // Save availability with debounce
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
        }
        pendingAvailabilityRef.current = null;
      } catch (err) {
        console.error('Save error:', err);
      } finally {
        setSaving(false);
      }
    },
    [eventId, participantId, participantToken]
  );

  const saveAvailability = useCallback(
    (newAvailability: Availability) => {
      if (!participantId || !participantToken) return;
      pendingAvailabilityRef.current = newAvailability;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => doSave(newAvailability), 500);
    },
    [participantId, participantToken, doSave]
  );

  // Flush pending save on tab close
  useEffect(() => {
    function handleBeforeUnload() {
      if (pendingAvailabilityRef.current && participantId && participantToken) {
        navigator.sendBeacon(
          `/api/events/${eventId}/participants/${participantId}`,
          new Blob(
            [JSON.stringify({ availability: pendingAvailabilityRef.current, token: participantToken })],
            { type: 'application/json' }
          )
        );
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [eventId, participantId, participantToken]);

  function handleAvailabilityChange(newAvailability: Availability) {
    setAvailability(newAvailability);
    saveAvailability(newAvailability);
  }

  // --- Render ---

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500">{error || '문제가 발생했습니다'}</p>
        <Link href="/" className="mt-4 text-emerald-500 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  if (state === 'password') {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-bold mb-1">{event?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">이 일정은 비밀번호가 필요합니다.</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            입장
          </button>
        </form>
      </div>
    );
  }

  if (state === 'name') {
    return (
      <div className="max-w-sm mx-auto px-4 py-16">
        <h1 className="text-xl font-bold mb-1">{event?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          현재 {event?.participants.length ?? 0}명 참여 중
        </p>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 입력"
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            maxLength={50}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            참여하기
          </button>
        </form>
      </div>
    );
  }

  // state === 'grid'
  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">{event?.title}</h1>
          <p className="text-xs text-gray-400">
            {saving ? '저장 중...' : '자동 저장됨'}
          </p>
        </div>
        <Link
          href={`/e/${eventId}/results`}
          className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          결과 보기
        </Link>
      </div>

      <DragGrid
        dates={event?.dates ?? []}
        timeStart={event?.time_start ?? 18}
        timeEnd={event?.time_end ?? 42}
        availability={availability}
        onAvailabilityChange={handleAvailabilityChange}
      />

      {/* Share link */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl">
        <p className="text-xs text-gray-500 mb-2">이 링크를 공유하세요:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg"
          />
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            복사
          </button>
        </div>
      </div>
    </div>
  );
}
