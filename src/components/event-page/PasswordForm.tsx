'use client';

import { useState } from 'react';
import { EventData } from '@/lib/types';

interface PasswordFormProps {
  event: EventData;
  eventId: string;
  onAuthenticated: (data: EventData) => void;
}

export default function PasswordForm({ event, eventId, onAuthenticated }: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${eventId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError('비밀번호가 틀렸습니다');
        return;
      }
      const eventRes = await fetch(`/api/events/${eventId}`);
      const data: EventData = await eventRes.json();
      onAuthenticated(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-bold mb-1">{event.title}</h1>
      <p className="text-sm text-gray-500 mb-6">이 일정은 비밀번호가 ��요합니다.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          disabled={loading}
          className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {loading ? '확인 중...' : '입장'}
        </button>
      </form>
    </div>
  );
}
