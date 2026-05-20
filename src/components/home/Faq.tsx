'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FAQS = [
  {
    q: 'when2meet과 뭐가 다른가요?',
    a: 'when2meet은 2008년에 만들어진 그대로라 모바일에서 드래그가 거의 안 되고, 한국어가 없으며, 이벤트를 만든 후에는 수정도 불가합니다. DayMeet는 모바일 그리드부터 다시 그렸고, 한국어 + 응답 비밀번호 보호 + 요일 모드 등 한국 모바일 사용자가 부딪히는 마찰 위주로 다듬었습니다.',
  },
  {
    q: 'Timeful 같은 모던 스케줄링 툴과는 어떻게 다른가요?',
    a: 'Timeful은 일정을 입력하려면 로그인이 필요하고, 무료 플랜은 월 3회 제한이 있습니다. DayMeet는 비로그인으로도 일정 입력 가능, 횟수 제한 없음. 또 결과 그리드가 색 농도뿐 아니라 셀마다 가능한 인원수를 숫자로 함께 표시해서 셀끼리 비교하기 쉽고, 가능한 시간을 모으는 모드 외에 "안 되는 시간"을 모으는 모드도 지원해서 빈 시간이 더 많은 모임에서 입력 부담을 줄일 수 있습니다.',
  },
  {
    q: '카톡으로 공유한 링크가 "Google 보안 브라우저" 오류를 띄워요.',
    a: 'Google이 카톡이나 네이버, 라인 같은 인앱브라우저에서 OAuth 로그인을 차단하기 때문입니다. DayMeet는 인앱브라우저를 자동 감지해서 외부 브라우저로 여는 버튼을 띄웁니다. 한 번 크롬이나 사파리에서 열면 그 후로는 정상 작동합니다.',
  },
  {
    q: '"가능"과 "필요하면 가능"을 구분할 수 있나요?',
    a: '네. 응답 시 3단계로 표시할 수 있어요. 불가, 필요하면, 가능 이렇게 셋입니다. 결과 화면에서도 단계별로 색이 다르게 표시되어 진짜 가능한 시간과 어쩔 수 없을 때 가능한 시간이 구분됩니다. when2meet은 가능과 불가 2단계만 있어서 모호한 시간이 어쩔 수 없이 가능 처리됩니다.',
  },
  {
    q: '응답한 시간을 다른 사람이 마음대로 바꾸지 못하게 하려면?',
    a: '응답을 저장할 때 비밀번호를 설정하면 본인만 수정할 수 있습니다. 비밀번호를 안 걸어도 같은 이름으로 다른 사람이 덮어쓰는 건 차단됩니다.',
  },
  {
    q: '정기 모임 (매주 화요일 같은)도 만들 수 있나요?',
    a: '가능합니다. 이벤트 생성 시 "날짜 모드" 대신 "요일 모드"를 선택하면 특정 날짜가 아닌 월~일 요일별로 가능한 시간을 모을 수 있어요. 동아리, 스터디, 주간 회의처럼 반복되는 약속에 적합합니다.',
  },
] as const;

export default function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="w-full max-w-3xl mx-auto px-4 py-20 sm:py-24 border-t border-gray-200/60"
    >
      <header className="text-center mb-10 sm:mb-12">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          FAQ
        </p>
        <h2
          id="faq-heading"
          className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900"
        >
          자주 묻는 질문
        </h2>
      </header>

      <div className="divide-y divide-gray-200 border-y border-gray-200">
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
                <span className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
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
                    <p className="pb-5 pr-10 text-sm text-gray-500 leading-relaxed">
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
