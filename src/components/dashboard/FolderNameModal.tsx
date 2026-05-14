'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface FolderNameModalProps {
  open: boolean;
  mode: 'create' | 'rename';
  initialName: string;
  submitting: boolean;
  error: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export default function FolderNameModal({
  open,
  mode,
  initialName,
  submitting,
  error,
  onSubmit,
  onClose,
}: FolderNameModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & { maxTouchPoints?: number };
    const hasTouch =
      'ontouchstart' in window || (nav.maxTouchPoints ?? 0) > 0;
    const narrowViewport = window.innerWidth < 768;
    if (hasTouch || narrowViewport) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget)
              (e.currentTarget as HTMLElement).dataset.bd = '1';
          }}
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              (e.currentTarget as HTMLElement).dataset.bd === '1'
            )
              onClose();
            (e.currentTarget as HTMLElement).dataset.bd = '';
          }}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4"
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'create' ? '새 폴더' : '폴더 이름 변경'}
              </h2>
            </div>
            <div className="px-5 py-2">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="폴더 이름"
                maxLength={40}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md transition-all focus:border-teal-600"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 shadow-[var(--shadow-primary)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? '저장 중...' : mode === 'create' ? '만들기' : '저장'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
