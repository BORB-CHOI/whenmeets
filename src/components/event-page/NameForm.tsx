'use client';

import { useState } from 'react';
import { EventData } from '@/lib/types';

interface NameFormProps {
  event: EventData;
  eventId: string;
  onJoined: (data: { id: string; token: string; existing?: boolean }) => void;
}

export default function NameForm({ event, eventId, onJoined }: NameFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    try {
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

      onJoined(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-bold mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        현재 {event.participants.length}명 참여 중
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 입력"
          disabled={loading}
          className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          maxLength={50}
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {loading ? '참��� 중...' : '참여하기'}
        </button>
      </form>
    </div>
  );
}
