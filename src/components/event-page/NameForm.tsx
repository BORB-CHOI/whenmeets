'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventData } from '@/lib/types';

interface NameFormProps {
  event: EventData;
  eventId: string;
  onJoined: (data: { id: string; name: string; token?: string; existing?: boolean }) => void;
}

export default function NameForm({ event, eventId, onJoined }: NameFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingMatch, setExistingMatch] = useState(false);

  // Debounce name matching against existing participants
  useEffect(() => {
    if (!name.trim()) {
      setExistingMatch(false);
      return;
    }
    const timer = setTimeout(() => {
      const match = event.participants.some(
        (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
      );
      setExistingMatch(match);
    }, 300);
    return () => clearTimeout(timer);
  }, [name, event.participants]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          className="px-4 py-3 border border-gray-200 rounded-md transition-all focus:border-emerald-600 disabled:opacity-50"
          maxLength={50}
        />
        <AnimatePresence>
          {existingMatch && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-amber-600"
            >
              응답 기록이 있는 사용자입니다. 기존 시간표를 수정합니다.
            </motion.p>
          )}
        </AnimatePresence>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-[38px] py-3 bg-emerald-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-emerald-700 hover:shadow-[var(--shadow-primary-hover)] transition-all disabled:opacity-50"
        >
          {loading ? '참여 중...' : existingMatch ? '수정하기' : '참여하기'}
        </button>
      </form>
    </div>
  );
}
