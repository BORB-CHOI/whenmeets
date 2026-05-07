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
      <h1 className="text-xl font-bold mb-1 dark:text-gray-100">{event.title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">이 이벤트는 비밀번호가 필요합니다.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          disabled={loading}
          className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-md transition-all focus:border-teal-600 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 bg-teal-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-teal-700 hover:shadow-[var(--shadow-primary-hover)] transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? '확인 중...' : '입장'}
        </button>
      </form>
    </div>
  );
}
