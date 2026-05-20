'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type InAppBrowserType,
  inAppBrowserLabel,
  openInExternalBrowser,
} from '@/lib/inAppBrowser';

interface InAppBrowserModalProps {
  type: InAppBrowserType;
  onClose: () => void;
}

export default function InAppBrowserModal({ type, onClose }: InAppBrowserModalProps) {
  const open = type !== null;
  const label = inAppBrowserLabel(type);
  const supportsAutoOpen = type === 'kakaotalk' || type === 'naver';

  const handleOpenExternal = () => {
    if (typeof window === 'undefined') return;
    const triggered = openInExternalBrowser(window.location.href, type);
    if (!triggered) {
      // Fallback for browsers without direct open scheme — copy URL.
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  };

  const handleCopyUrl = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // ignore
    }
  };

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              외부 브라우저에서 열어주세요
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Google 정책상 {label} 인앱브라우저에서는 구글 로그인이 차단됩니다.
              크롬, 사파리 등 외부 브라우저에서 다시 열어주세요.
            </p>

            {!supportsAutoOpen && (
              <div className="text-xs text-gray-500 mb-4 leading-relaxed bg-gray-50 rounded-md p-3">
                우측 상단 메뉴(⋯ 또는 ⋮)에서 <b>&apos;다른 브라우저로 열기&apos;</b> 또는
                <b> &apos;Safari/Chrome에서 열기&apos;</b>를 선택해주세요.
              </div>
            )}

            <div className="flex flex-col gap-2">
              {supportsAutoOpen && (
                <button
                  onClick={handleOpenExternal}
                  className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-md transition-colors cursor-pointer"
                >
                  외부 브라우저로 열기
                </button>
              )}
              <button
                onClick={handleCopyUrl}
                className="w-full h-10 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                링크 복사
              </button>
              <button
                onClick={onClose}
                className="w-full h-10 text-gray-500 text-sm font-medium rounded-md hover:text-gray-700 transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
