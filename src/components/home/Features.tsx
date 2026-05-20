const FEATURES = [
  {
    title: '3초면 이벤트 생성',
    body: '다른 도구의 step-by-step 위저드(4~6단계)와 달리 모달 하나에서 제목, 날짜, 시간만 입력하면 끝. 회원가입도 없음. 참여자도 링크만 받으면 즉시 들어옵니다.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: '모바일 우선',
    body: '카톡으로 받은 링크를 폰에서 그대로 사용. 큰 셀, 부드러운 스크롤, 손가락 드래그에 맞춘 그리드.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <line x1="11" y1="17.5" x2="13" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '실시간 동기화',
    body: '누군가 시간을 추가하면 다른 사람 화면에도 즉시 반영. 새로고침 필요 없음.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M4 12a8 8 0 0114-5.3M20 4v4h-4M20 12a8 8 0 01-14 5.3M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: '무료 + 오픈소스',
    body: '광고 외 결제나 프리미엄 없음. 코드는 GitHub에 공개, 누구든 검토하고 기여 가능.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M9 19c-4 1-4-2-6-2.5M15 21v-3.5a3 3 0 00-1-2.3c3.3-.4 6.5-1.6 6.5-7.2A5.6 5.6 0 0019 4.5a5.2 5.2 0 00-.1-3.8s-1.1-.4-3.5 1.3a12 12 0 00-6.5 0C6.6.3 5.5.7 5.5.7a5.2 5.2 0 00-.1 3.8 5.6 5.6 0 00-1.5 3.7c0 5.5 3.3 6.8 6.5 7.2a3 3 0 00-1 2.3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export default function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="w-full max-w-5xl mx-auto px-4 py-20 sm:py-24 border-t border-gray-200/60"
    >
      <header className="text-center mb-12 sm:mb-16">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          Features
        </p>
        <h2
          id="features-heading"
          className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900"
        >
          왜 DayMeet인가요?
        </h2>
        <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
          when2meet의 한국어, 모바일 친화 대안. 필요한 것만 빠르게.
        </p>
      </header>

      <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ title, body, icon }) => (
          <article
            key={title}
            className="rounded-xl bg-white p-6 border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              {icon}
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
