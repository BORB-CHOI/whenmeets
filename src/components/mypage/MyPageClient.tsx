'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';

interface MyPageClientProps {
  email: string;
  initialName: string;
  avatarUrl: string | null;
}

export default function MyPageClient({ email, initialName, avatarUrl }: MyPageClientProps) {
  const router = useRouter();
  const supabaseRef = useRef(createAuthBrowserClient());
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
    const { error: updateError } = await supabaseRef.current.auth.updateUser({
      data: { full_name: trimmed },
    });
    if (updateError) {
      setSaving(false);
      setError(updateError.message || '이름 변경에 실패했습니다');
      return;
    }

    // Propagate the new display name to all events the user already participates in
    let sync: { updated: number; skipped: number } | null = null;
    try {
      const res = await fetch('/api/user/sync-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        sync = await res.json();
      }
    } catch {
      // Non-fatal: profile updated, but participant rows may not be in sync.
    }

    setSaving(false);
    setSavedName(trimmed);
    setSyncInfo(sync);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  const initial = (savedName?.[0] || email?.[0] || 'U').toUpperCase();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Avatar + email */}
      <div className="flex items-center gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
        <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-lg font-bold">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{savedName || '이름 없음'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{email}</p>
        </div>
      </div>

      {/* Name form */}
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
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md transition-all focus:border-emerald-600 dark:bg-gray-900 dark:text-gray-100"
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
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-[var(--shadow-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                className="text-sm text-emerald-600 dark:text-emerald-400 font-medium"
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
