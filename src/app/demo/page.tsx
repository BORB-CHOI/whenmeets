import type { Metadata } from 'next';
import Link from 'next/link';
import DemoEventViewer from '@/components/demo/DemoEventViewer';
import { DEMO_FIXTURE, USE_CASE_FIXTURES, USE_CASE_SLUGS } from '@/lib/demo-data';
import { stripEmphasis } from '@/lib/render-emphasis';

export const metadata: Metadata = {
  title: '실제 사용 화면 데모 | WhenMeets',
  description: 'WhenMeets가 실제로 어떻게 동작하는지 미리 보세요. 5명의 응답자가 시간을 표시한 결과 히트맵과, 드래그로 직접 입력해 보는 체험 모드를 한 페이지에서 제공합니다.',
  alternates: {
    canonical: '/demo',
  },
  openGraph: {
    title: '실제 사용 화면 데모 | WhenMeets',
    description: '결과 히트맵 + 인터랙티브 체험. 회원가입 없이 도구가 어떻게 동작하는지 확인하세요.',
    type: 'website',
  },
};

export default function DemoPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-10 sm:mb-14 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          Live demo
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          이렇게 동작합니다
        </h1>
        <p className="mt-4 text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          아래는 다섯 명의 친구가 <strong className="font-semibold text-gray-900">7월 주말 저녁 약속</strong>을 잡은 실제와 동일한 화면입니다.
          가장 진한 셀이 모두에게 가능한 시간이고, 색이 옅어질수록 가능한 인원이 줄어듭니다.
          오른쪽 위의 <strong className="font-semibold text-gray-900">내 시간 입력해보기</strong>를 누르면 직접 드래그해서 체험할 수 있습니다.
        </p>
      </header>

      <section className="mb-12">
        <DemoEventViewer fixture={DEMO_FIXTURE} />
      </section>

      <section className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article className="p-5 rounded-xl border border-gray-200 bg-white">
          <h2 className="text-base font-bold text-gray-900 mb-2">색의 의미</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            기본 색은 짙은 청록(teal)입니다. 한 셀에 가능 표시를 한 사람이 많을수록 색이 진하고,
            한 명이라도 <strong className="font-semibold text-gray-900">안 됨</strong>이면 옅어집니다. <strong className="font-semibold text-gray-900">If Needed</strong>(필요하면 가능)는 호박색으로 따로 구분됩니다.
          </p>
        </article>
        <article className="p-5 rounded-xl border border-gray-200 bg-white">
          <h2 className="text-base font-bold text-gray-900 mb-2">왜 단톡방보다 빠른가</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            단톡방에서 8명에게 시간을 묻는 데 보통 한 주가 걸립니다. WhenMeets는 호스트가 1분 안에
            링크를 만들고, 응답자가 30초 안에 가능한 시간을 드래그합니다. 결과는 자동 계산되므로
            “언제가 좋아?” 질문이 다시 돌지 않습니다.
          </p>
        </article>
        <article className="p-5 rounded-xl border border-gray-200 bg-white">
          <h2 className="text-base font-bold text-gray-900 mb-2">회원가입 없음</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            호스트도 응답자도 가입 없이 사용 가능합니다. 카카오톡 인앱 브라우저에서 그대로 열리며,
            비밀번호 옵션을 켜면 다른 사람이 내 응답을 임의로 수정하지 못하도록 보호할 수 있습니다.
          </p>
        </article>
      </section>

      <section className="mb-12 rounded-xl border border-teal-200 bg-teal-50 p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          위 화면이 마음에 들면 1분 만에 같은 이벤트를 만들 수 있습니다
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5">
          후보 날짜와 시간대만 입력하면 끝. 링크를 복사해서 단톡방, 슬랙, 메신저 어디든 공유하세요.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 transition-colors"
        >
          무료로 이벤트 만들기
        </Link>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">상황별 사용 사례 더 보기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {USE_CASE_SLUGS.map((slug) => {
            const fixture = USE_CASE_FIXTURES[slug];
            return (
              <Link
                key={slug}
                href={`/use-cases/${slug}`}
                className="block p-4 rounded-lg border border-gray-200 bg-white hover:border-teal-400 hover:shadow-sm transition-all"
              >
                <h3 className="text-sm font-bold text-gray-900">{fixture.title}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{stripEmphasis(fixture.scenarioHeadline)}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
