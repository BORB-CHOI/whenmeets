'use client';

import { useState, useEffect } from 'react';
import EventFormModal from '@/components/event-form/EventFormModal';
import InlineDeleteButton from '@/components/ui/InlineDeleteButton';
import { getEventHistory, removeEventFromHistory, EventHistoryItem } from '@/lib/event-history';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  useEffect(() => {
    const local = getEventHistory();
    if (local.length === 0) {
      setHistory([]);
      return;
    }
    setHistory(local);
    fetch('/api/events/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: local.map((h) => h.id) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.activeIds) return;
        const active = new Set<string>(data.activeIds);
        setHistory((prev) => prev.filter((h) => active.has(h.id)));
      })
      .catch(() => { /* keep local list on network error */ });
  }, []);

  return (
    <div className="relative flex flex-col items-center px-4 py-20 sm:py-28 overflow-hidden flex-1 w-full">
      {/* CSS-only background — lightweight, KakaoTalk in-app browser compatible.
          Vertical gradient ending at footer bg so the page floor flows into
          the footer with no visible seam. The previous diagonal `to-br` with
          via-white dumped the white midpoint at the bottom on wide-and-short
          viewports, looking like a gap before the footer. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-teal-50 to-gray-50 dark:from-gray-900 dark:to-gray-800">
        {/* Soft radial accents — static, no animation, no blur filter */}
        <div
          className="absolute rounded-full"
          style={{
            width: '60vmax', height: '60vmax',
            background: 'radial-gradient(circle, rgba(0,137,123,0.08) 0%, transparent 70%)',
            top: '-20vmax', left: '-10vmax',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '50vmax', height: '50vmax',
            background: 'radial-gradient(circle, rgba(77,182,172,0.1) 0%, transparent 70%)',
            bottom: '-15vmax', right: '-10vmax',
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Hero content */}
      <h1
        className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
        style={{ animation: 'fadeInUp 0.6s ease-out both' }}
      >
        WhenMeets
      </h1>
      <p
        className="mt-3 text-lg text-gray-500 dark:text-gray-400 text-center max-w-sm text-balance"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
      >
        모바일에서도 편하게 쓰는 그룹 일정 조율. 무료, 오픈소스.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="mt-8 px-8 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-teal-700 hover:shadow-[var(--shadow-primary-hover)] transition-all text-lg cursor-pointer"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
      >
        이벤트 만들기
      </button>
      <p
        className="mt-12 text-xs text-gray-400 dark:text-gray-500"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
      >
        회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.
      </p>

      {history.length > 0 && (
        <div className="mt-12 w-full max-w-lg px-4" style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-3">최근 기록</h2>
          <div className="flex flex-col gap-2.5">
            {history.slice(0, 5).map((item) => (
              <a
                key={item.id}
                href={`/e/${item.id}`}
                className="flex items-center justify-between min-h-14 px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {item.role === 'creator' ? '내가 만듦' : '참여함'} · {item.dates.length}일
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30">
                    {item.role === 'creator' ? '관리' : '참여'}
                  </span>
                  <InlineDeleteButton
                    title="기록에서 삭제"
                    className="opacity-0 group-hover:opacity-100"
                    onConfirm={() => {
                      removeEventFromHistory(item.id);
                      setHistory((h) => h.filter((x) => x.id !== item.id));
                    }}
                  />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <EventFormModal open={showModal} onClose={() => setShowModal(false)} />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
