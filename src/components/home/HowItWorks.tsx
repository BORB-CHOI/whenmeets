import Step1Mockup from './mockups/Step1Mockup';
import Step2Mockup from './mockups/Step2Mockup';
import Step3Mockup from './mockups/Step3Mockup';

const STEPS = [
  {
    n: 1,
    title: '이벤트 만들기',
    body: '제목과 후보 날짜, 가능한 시간대만 입력하세요. 회원가입 없이 3초면 끝납니다.',
    Mockup: Step1Mockup,
  },
  {
    n: 2,
    title: '링크 공유',
    body: '생성된 링크를 카카오톡, 슬랙, 메신저 어디든 공유하세요. 참여자는 가입 없이 바로 들어옵니다.',
    Mockup: Step2Mockup,
  },
  {
    n: 3,
    title: '시간 고르기',
    body: '각자 가능한 시간을 드래그로 선택하면 모두에게 가능한 시간이 자동으로 계산됩니다.',
    Mockup: Step3Mockup,
  },
] as const;

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="w-full max-w-5xl mx-auto px-4 py-20 sm:py-28"
    >
      <header className="text-center mb-12 sm:mb-16">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400">
          How it works
        </p>
        <h2
          id="how-it-works-heading"
          className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
        >
          이렇게 사용하세요
        </h2>
        <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          복잡한 설정도 메신저 그룹채팅도 필요 없습니다. 세 단계면 끝.
        </p>
      </header>

      <div className="grid gap-8 sm:gap-10 lg:grid-cols-3 items-stretch">
        {STEPS.map(({ n, title, body, Mockup }) => (
          <article
            key={n}
            className="flex flex-col items-center text-center"
          >
            <div className="relative w-full max-w-80 aspect-4/3 min-h-60 rounded-2xl bg-linear-to-br from-teal-50 via-white to-gray-50 border border-gray-200/60 shadow-sm flex items-center justify-center p-6">
              <Mockup />
              <span className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-teal-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
                {n}
              </span>
            </div>
            <h3 className="mt-6 text-lg sm:text-xl font-bold text-gray-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-xs">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
