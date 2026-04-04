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
      <div className="absolute inset-0 -z-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 40%, #A7F3D0 70%, #ECFDF5 100%)' }}
      >
        <div
          className="absolute opacity-80"
          style={{
            width: '700px', height: '500px',
            background: 'linear-gradient(135deg, rgba(5,150,105,0.4) 0%, rgba(52,211,153,0.3) 50%, rgba(167,243,208,0.2) 100%)',
            borderRadius: '40% 60% 55% 45% / 55% 40% 60% 45%',
            filter: 'blur(50px)',
            top: '-250px', left: '-150px',
            animation: 'blob1 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute opacity-80"
          style={{
            width: '600px', height: '450px',
            background: 'linear-gradient(225deg, rgba(52,211,153,0.45) 0%, rgba(110,231,183,0.3) 50%, rgba(5,150,105,0.15) 100%)',
            borderRadius: '50% 50% 45% 55% / 55% 45% 50% 50%',
            filter: 'blur(50px)',
            bottom: '-200px', right: '-100px',
            animation: 'blob2 15s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '500px', height: '400px',
            background: 'linear-gradient(180deg, rgba(16,185,129,0.35) 0%, rgba(52,211,153,0.25) 50%, rgba(167,243,208,0.15) 100%)',
            borderRadius: '45% 55% 50% 50% / 50% 45% 55% 50%',
            filter: 'blur(40px)',
            top: '40%', left: '45%',
            transform: 'translate(-50%, -50%)',
            animation: 'blob3 18s ease-in-out infinite',
          }}
        />
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
        className="mt-8 px-8 py-3 bg-emerald-600 text-white font-semibold rounded-md shadow-[var(--shadow-primary)] hover:bg-emerald-700 hover:shadow-[var(--shadow-primary-hover)] focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 transition-all text-lg cursor-pointer"
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
                      ? 'text-emerald-600 bg-emerald-50'
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
          33% { transform: translate(40px, -50px) rotate(120deg) scale(1.12); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-25px, 35px) rotate(240deg) scale(0.93); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 50% 50% 45% 55% / 55% 45% 50% 50%; }
          33% { transform: translate(-50px, 25px) rotate(-120deg) scale(1.08); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
          66% { transform: translate(30px, -40px) rotate(-240deg) scale(1.15); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%; }
          33% { transform: translate(-50%, -50%) translate(45px, 30px) rotate(90deg) scale(0.93); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-50%, -50%) translate(-35px, -25px) rotate(180deg) scale(1.08); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
