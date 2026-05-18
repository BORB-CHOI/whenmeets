import type { Metadata } from 'next';
import Link from 'next/link';
import { USE_CASE_FIXTURES, USE_CASE_SLUGS } from '@/lib/demo-data';
import { renderEmphasis } from '@/lib/render-emphasis';

export const metadata: Metadata = {
  title: '사용 사례 | WhenMeets',
  description: '결혼식 후 동창회, 가족 명절 일정, 팀 회의, 스터디 그룹. 실제 상황별로 WhenMeets가 어떻게 도움이 되는지 데모와 함께 살펴보세요.',
  alternates: {
    canonical: '/use-cases',
  },
  openGraph: {
    title: '사용 사례 | WhenMeets',
    description: '상황별 데모와 함께 보는 그룹 일정 조율 시나리오 네 가지.',
    type: 'website',
  },
};

export default function UseCasesIndexPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-12 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          Use cases
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          어떤 상황에서 쓰면 좋을까
        </h1>
        <p className="mt-4 text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          단톡방에서 “시간 언제 돼?”로 한 주를 날리는 모든 상황에 WhenMeets가 어울립니다.
          가장 흔한 네 가지 시나리오를 실제 데모와 함께 정리했습니다.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {USE_CASE_SLUGS.map((slug) => {
          const fixture = USE_CASE_FIXTURES[slug];
          return (
            <Link
              key={slug}
              href={`/use-cases/${slug}`}
              className="group block p-6 rounded-xl border border-gray-200 bg-white hover:border-teal-400 hover:shadow-md transition-all"
            >
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                {fixture.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {renderEmphasis(fixture.scenarioHeadline)}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {fixture.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
              <div className="mt-5 text-xs font-semibold text-teal-600 group-hover:underline">
                자세히 보기 →
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/demo"
          className="text-sm font-medium text-teal-600 hover:underline"
        >
          전체 데모 페이지 →
        </Link>
      </div>
    </div>
  );
}
