'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface MyPageClientProps {
  email: string;
  initialName: string;
  avatarUrl: string | null;
}

export default function MyPageClient({ email, initialName, avatarUrl }: MyPageClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const dirty = name.trim() !== savedName.trim();

  const [syncInfo, setSyncInfo] = useState<{ updated: number; skipped: number } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    setError('');
    setSyncInfo(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || '이름 변경에 실패했습니다');
        return;
      }
      const data = await res.json();
      setSavedName(data.profile?.display_name ?? trimmed);
      setSyncInfo(data.participants ?? null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const initial = (savedName?.[0] || email?.[0] || 'U').toUpperCase();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <div className="flex items-center gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
        <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 text-lg font-bold">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{savedName || '이름 없음'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="pt-5 flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
          placeholder="이름을 입력하세요"
          maxLength={50}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md transition-all focus:border-teal-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          이벤트 참여 시 다른 사용자에게 표시되는 이름입니다.
        </p>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 mt-1">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 shadow-[var(--shadow-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <AnimatePresence>
            {success && (
              <motion.span
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-teal-600 dark:text-teal-400 font-medium"
              >
                저장되었습니다
                {syncInfo && syncInfo.updated > 0 && ` · ${syncInfo.updated}개 이벤트에 반영`}
                {syncInfo && syncInfo.skipped > 0 && ` (${syncInfo.skipped}개는 이름 충돌로 건너뜀)`}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
