'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import EventFormModal from '@/components/event-form/EventFormModal';
import InlineDeleteButton from '@/components/ui/InlineDeleteButton';
import { getEventHistory, removeEventFromHistory, EventHistoryItem } from '@/lib/event-history';
import HowItWorks from '@/components/home/HowItWorks';
import Features from '@/components/home/Features';
import Faq from '@/components/home/Faq';
import DemoEventViewer from '@/components/demo/DemoEventViewer';
import { DEMO_FIXTURE, USE_CASE_FIXTURES, USE_CASE_SLUGS } from '@/lib/demo-data';

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
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col flex-1 w-full">
      <section
        aria-label="히어로"
        className="relative w-full overflow-hidden flex items-center lg:min-h-190"
      >
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-teal-50 to-gray-50">
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
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="w-full max-w-6xl mx-auto px-4 py-12 sm:py-16 lg:py-20 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">
          <div className="min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900"
              style={{ animation: 'fadeInUp 0.6s ease-out both' }}
            >
              WhenMeets
            </h1>
            <p
              className="mt-4 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
            >
              <span className="whitespace-nowrap">모바일에서도 편하게 쓰는</span>{' '}
              <span className="whitespace-nowrap">그룹 일정 조율.</span>
              <br />
              회원가입 없이, 1분이면 끝납니다.
            </p>
            <div
              className="mt-8 flex flex-wrap items-center gap-3 justify-center lg:justify-start"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            >
              <button
                onClick={() => setShowModal(true)}
                className="px-7 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-(--shadow-primary) hover:bg-teal-700 hover:shadow-(--shadow-primary-hover) transition-all text-lg cursor-pointer"
              >
                이벤트 만들기
              </button>
              <Link
                href="/demo"
                className="px-7 py-3 bg-white text-teal-700 font-semibold rounded-md border border-teal-200 hover:bg-teal-50 transition-colors text-lg"
              >
                데모 화면 보기
              </Link>
            </div>
            <p
              className="mt-6 text-xs sm:text-sm text-gray-500"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
            >
              무료, 오픈소스, 광고 없음, 카카오톡에서 바로 동작
            </p>
          </div>

          <div
            className="min-w-0 flex items-center justify-center w-full"
            style={{ animation: 'fadeInUp 0.6s ease-out 0.4s both' }}
          >
            <div className="w-full max-w-full overflow-x-auto">
              <DemoEventViewer fixture={DEMO_FIXTURE} enableEdit={false} />
            </div>
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section
          aria-label="최근 기록"
          className="w-full max-w-3xl mx-auto px-4 py-12 sm:py-14"
          style={{ animation: 'fadeInUp 0.5s ease-out both' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            최근 기록
          </h2>
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
                    {item.role === 'creator' ? '내가 만듦' : '참여함'}, {item.dates.length}일
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded text-teal-600 bg-teal-50">
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
        </section>
      )}

      <section
        id="live-preview"
        aria-label="실제 동작 미리보기"
        className="w-full bg-white border-y border-gray-100"
      >
        <div className="w-full max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <header className="text-center mb-10">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
              Try it now
            </p>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              직접 드래그해서 체험해 보세요
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed">
              위에서 본 결과 화면을 직접 조작할 수 있는 영역입니다. 오른쪽 위의 "내 시간 입력해보기"를 누르고
              가능한 시간을 드래그해 보세요. 입력값은 새로고침 시 사라지므로 안심하고 시도할 수 있습니다.
            </p>
          </header>

          <DemoEventViewer fixture={DEMO_FIXTURE} />

          <div className="text-center mt-8">
            <Link
              href="/demo"
              className="text-sm font-medium text-teal-600 hover:underline"
            >
              전체 데모 페이지에서 더 자세히 보기 →
            </Link>
          </div>
        </div>
      </section>

      <HowItWorks />

      <section
        aria-label="상황별 사용 사례"
        className="w-full max-w-6xl mx-auto px-4 py-16 sm:py-20"
      >
        <header className="text-center mb-12">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
            Use cases
          </p>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            이런 상황에서 쓰면 좋아요
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            결혼식 후 모임부터 명절 가족 모임, 팀 회의, 대학 스터디까지. 실제 시나리오와 데모를 함께 정리했습니다.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {USE_CASE_SLUGS.map((slug) => {
            const fixture = USE_CASE_FIXTURES[slug];
            return (
              <Link
                key={slug}
                href={`/use-cases/${slug}`}
                className="group flex flex-col p-6 rounded-xl border border-gray-200 bg-white hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                  {fixture.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {fixture.scenarioHeadline}
                </p>
                <div className="mt-auto pt-4 text-xs font-semibold text-teal-600 group-hover:underline">
                  데모와 함께 자세히 보기 →
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/use-cases"
            className="text-sm font-medium text-teal-600 hover:underline"
          >
            전체 사용 사례 보기 →
          </Link>
        </div>
      </section>

      <Features />

      <section
        aria-label="사용 가이드 안내"
        className="w-full bg-gray-50/70 border-y border-gray-100"
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
                Guide
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                더 자세히 알아보고 싶다면
              </h2>
              <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                캘린더 모드 vs 요일 모드의 차이, 시간 없는 “날짜만” 모드, 결과 히트맵 해석 방법, 비밀번호 옵션,
                그리고 Timeful, When2meet 같은 비슷한 도구와의 정직한 비교까지 한 페이지에 정리했습니다.
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Link
                href="/guide"
                className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 transition-colors"
              >
                사용 가이드 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Faq />

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
