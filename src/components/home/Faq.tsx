'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FAQS = [
  {
    q: '회원가입을 꼭 해야 하나요?',
    a: '아니요. 이벤트를 만드는 사람도, 참여하는 사람도 모두 회원가입 없이 사용할 수 있습니다. 다만 구글 로그인을 하면 만든 이벤트를 대시보드에서 한눈에 관리할 수 있어요.',
  },
  {
    q: 'when2meet과 어떻게 다른가요?',
    a: '한국어 인터페이스, 모바일 친화적 그리드, 비밀번호로 응답을 보호하는 기능, 실시간 동기화, 카카오톡 인앱브라우저 호환 로그인 안내 등 한국 사용자에게 필요한 기능을 우선 다듬었습니다.',
  },
  {
    q: '응답한 시간을 다른 사람이 마음대로 바꿀 수 있나요?',
    a: '응답을 저장할 때 비밀번호를 설정하면 본인만 수정할 수 있습니다. 비밀번호 없이 익명으로 응답해도 다른 사람이 같은 이름으로 덮어쓰는 걸 막아줍니다.',
  },
  {
    q: '날짜 대신 요일로만 일정 조율도 가능한가요?',
    a: '네, 정기 모임처럼 특정 날짜가 아닌 요일 기준으로 가능한 시간을 모을 수 있는 모드를 지원합니다. 이벤트 생성 시 모드를 선택하세요.',
  },
  {
    q: '데이터는 얼마나 보관되나요? 비용은요?',
    a: '서비스 운영에 필요한 기간만 보관하며, 자세한 내용은 개인정보처리방침에 정리해두었습니다. 광고 외 유료 결제는 없습니다 — 모든 기능 무료.',
  },
] as const;

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="w-full max-w-3xl mx-auto px-4 py-20 sm:py-24 border-t border-gray-200/60 dark:border-gray-700/60"
    >
      <header className="text-center mb-10 sm:mb-12">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
        >
          자주 묻는 질문
        </h2>
      </header>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 border-y border-gray-200 dark:border-gray-700">
        {FAQS.map(({ q, a }, i) => {
          const open = openIdx === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group"
              >
                <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                  {q}
                </span>
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-teal-600' : ''}`}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 pr-10 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
