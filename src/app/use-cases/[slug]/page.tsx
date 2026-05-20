import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DemoEventViewer from '@/components/demo/DemoEventViewer';
import { USE_CASE_FIXTURES, USE_CASE_SLUGS, getUseCaseFixture } from '@/lib/demo-data';
import { renderEmphasis, stripEmphasis } from '@/lib/render-emphasis';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return USE_CASE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fixture = getUseCaseFixture(slug);
  if (!fixture) {
    return { title: '사용 사례 | DayMeet' };
  }
  const plainHeadline = stripEmphasis(fixture.scenarioHeadline);
  return {
    title: `${fixture.title} | DayMeet 사용 사례`,
    description: plainHeadline,
    keywords: fixture.keywords,
    alternates: {
      canonical: `/use-cases/${fixture.slug}`,
    },
    openGraph: {
      title: `${fixture.title} | DayMeet`,
      description: plainHeadline,
      type: 'article',
    },
  };
}

export default async function UseCasePage({ params }: PageProps) {
  const { slug } = await params;
  const fixture = getUseCaseFixture(slug);
  if (!fixture) {
    notFound();
  }

  const otherSlugs = USE_CASE_SLUGS.filter((s) => s !== fixture.slug);

  return (
    <article className="w-full max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-10">
        <nav className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-teal-600">홈</Link>
          <span className="mx-2 text-gray-300">/</span>
          <Link href="/use-cases" className="hover:text-teal-600">사용 사례</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-700">{fixture.title}</span>
        </nav>
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          Use case
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          {fixture.title}
        </h1>
        <p className="mt-4 text-lg text-gray-600 leading-relaxed">
          {renderEmphasis(fixture.scenarioHeadline)}
        </p>
      </header>

      <section className="mb-12 flex flex-col gap-5 text-base text-gray-700 leading-relaxed">
        {fixture.scenarioBody.map((paragraph, index) => (
          <p key={index}>{renderEmphasis(paragraph)}</p>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">실제 화면 미리 보기</h2>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          아래는 {fixture.title.toLowerCase()} 상황을 가정한 데모입니다. 응답자 {fixture.participants.length}명이
          이미 자신의 가능 시간을 표시한 결과 히트맵이며, <strong className="font-semibold text-gray-900">내 시간 입력해보기</strong>를 눌러 직접 드래그할 수도 있습니다.
        </p>
        <DemoEventViewer fixture={fixture} />
      </section>

      <section className="mb-12 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">이 상황에서 DayMeet가 빛나는 이유</h2>
        <ul className="flex flex-col gap-3">
          {fixture.takeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-3 text-sm sm:text-base text-gray-700 leading-relaxed">
              <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
              <span>{renderEmphasis(takeaway)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12 rounded-xl border border-teal-200 bg-teal-50 p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          같은 흐름으로 내 일정도 1분 안에
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5">
          후보 날짜와 시간대만 입력하면 끝. 링크를 받은 사람들은 가입 없이 바로 응답할 수 있습니다.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 transition-colors"
        >
          이벤트 만들기
        </Link>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">다른 사용 사례</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {otherSlugs.map((s) => {
            const other = USE_CASE_FIXTURES[s];
            return (
              <Link
                key={s}
                href={`/use-cases/${s}`}
                className="block p-4 rounded-lg border border-gray-200 bg-white hover:border-teal-400 hover:shadow-sm transition-all"
              >
                <h3 className="text-sm font-bold text-gray-900">{other.title}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{stripEmphasis(other.scenarioHeadline)}</p>
              </Link>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <Link href="/guide" className="text-sm font-medium text-teal-600 hover:underline">
            사용 가이드 전체 보기 →
          </Link>
        </div>
      </section>
    </article>
  );
}
