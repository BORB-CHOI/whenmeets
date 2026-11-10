'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getMeasurementConsent, isMeasurementEnabled, setMeasurementConsent, trackEvent } from '@/lib/measurement-client';
import { MEASUREMENT_STORAGE_KEYS } from '@/lib/constants';
import { detectInAppBrowser } from '@/lib/inAppBrowser';

function subscribeConsent(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener('daymeet-measurement-consent', update);
  return () => { window.removeEventListener('storage', update); window.removeEventListener('daymeet-measurement-consent', update); };
}

function consentSnapshot() {
  return isMeasurementEnabled() && window.parent === window ? getMeasurementConsent() : 'disabled' as const;
}

export default function MeasurementProvider() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeConsent, consentSnapshot, () => 'disabled' as const);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isMeasurementEnabled() || window.parent !== window) return;
    const restore = () => {
      const granted = getMeasurementConsent() === 'granted';
      if (getMeasurementConsent() !== null) void setMeasurementConsent(granted).then((saved) => { setReady(saved && granted); setError(!saved); });
    };
    restore();
    const storage = (event: StorageEvent) => { if (event.key === MEASUREMENT_STORAGE_KEYS.consent) restore(); };
    const preferences = () => setEditing(true);
    window.addEventListener('storage', storage);
    window.addEventListener('daymeet-measurement-preferences', preferences);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('daymeet-measurement-preferences', preferences); };
  }, []);

  useEffect(() => {
    if (choice === 'granted' && ready) trackEvent('page_viewed', { page_path: pathname, browser_context: detectInAppBrowser() ? 'in_app' : 'browser' });
  }, [pathname, choice, ready]);

  async function choose(granted: boolean) {
    setBusy(true); setError(false);
    const saved = await setMeasurementConsent(granted);
    setReady(saved && granted); setError(!saved); setBusy(false);
    if (saved) setEditing(false);
  }

  if (choice === 'disabled') return null;
  return (
    <>
      <button type="button" onClick={() => setEditing(true)} className="block mx-auto px-4 py-2 text-xs text-gray-500 underline cursor-pointer">전환 측정 설정</button>
      <AnimatePresence>
        {(choice === null || editing || error) && (
          <motion.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="region" aria-label="전환 측정 선택" className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:left-auto sm:mx-0">
            <p className="text-sm text-gray-700">서비스 개선과 광고 효과 측정을 위해 Google Analytics와 OpenAI 측정을 허용할까요? 선택하지 않아도 일정 조율을 이용할 수 있습니다.</p>
            {error && <p role="alert" className="mt-2 text-xs text-red-600">선택을 저장하지 못했습니다. 다시 시도해 주세요.</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => void choose(false)} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 cursor-pointer">허용 안 함</button>
              <button type="button" disabled={busy} onClick={() => void choose(true)} className="rounded-md bg-teal-600 px-3 py-2 text-sm text-white transition-colors hover:bg-teal-700 disabled:opacity-50 cursor-pointer">허용</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
