'use client';

import { useState, useEffect } from 'react';
import EventFormModal from '@/components/event-form/EventFormModal';
import { getEventHistory, removeEventFromHistory, EventHistoryItem } from '@/lib/event-history';

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  useEffect(() => { setHistory(getEventHistory()); }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100dvh-57px)] sm:min-h-[calc(100dvh-65px)] px-4 overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute w-100 h-100 sm:w-125 sm:h-125 rounded-[40%_60%_55%_45%/55%_40%_60%_45%] opacity-35 sm:opacity-45"
          style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            top: '-15%',
            left: '-20%',
            animation: 'blob1 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-87.5 h-87.5 sm:w-112.5 sm:h-112.5 rounded-[55%_45%_40%_60%/45%_55%_45%_55%] opacity-35 sm:opacity-50"
          style={{
            background: 'linear-gradient(225deg, #7C3AED, #4F46E5)',
            top: '50%',
            right: '-25%',
            animation: 'blob2 16s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-75 h-75 sm:w-100 sm:h-100 rounded-[45%_55%_60%_40%/60%_45%_55%_40%] opacity-30 sm:opacity-45"
          style={{
            background: 'linear-gradient(315deg, #4F46E5, #8B5CF6)',
            bottom: '-10%',
            left: '-15%',
            animation: 'blob3 18s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 backdrop-blur-[50px]" />
      </div>

      {/* Hero content */}
      <h1
        className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900"
        style={{ animation: 'fadeInUp 0.6s ease-out both' }}
      >
        WhenMeets
      </h1>
      <p
        className="mt-3 text-lg text-gray-500 text-center max-w-sm text-balance"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
      >
        모바일에서도 편하게 쓰는 그룹 일정 조율. 무료, 오픈소스.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="mt-8 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 transition-all text-lg cursor-pointer"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
      >
        이벤트 만들기
      </button>
      <p
        className="mt-12 text-xs text-gray-400"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
      >
        회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.
      </p>

      {history.length > 0 && (
        <div className="mt-12 w-full max-w-lg px-4" style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">최근 이벤트</h2>
          <div className="flex flex-col gap-2.5">
            {history.slice(0, 5).map((item) => (
              <a
                key={item.id}
                href={`/e/${item.id}`}
                className="flex items-center justify-between min-h-14 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.role === 'creator' ? '내가 만듦' : '참여함'} · {item.dates.length}일
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded ${
                    item.role === 'creator'
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-emerald-600 bg-emerald-50'
                  }`}>
                    {item.role === 'creator' ? '관리' : '참여'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeEventFromHistory(item.id);
                      setHistory((h) => h.filter((x) => x.id !== item.id));
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="기록에서 삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <EventFormModal open={showModal} onClose={() => setShowModal(false)} />

      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
          33% { transform: translate(30px, -40px) rotate(120deg) scale(1.1); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-20px, 30px) rotate(240deg) scale(0.95); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          33% { transform: translate(-40px, 20px) rotate(-120deg) scale(1.05); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
          66% { transform: translate(25px, -35px) rotate(-240deg) scale(1.1); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
          33% { transform: translate(35px, 25px) rotate(90deg) scale(0.95); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-30px, -20px) rotate(180deg) scale(1.05); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
