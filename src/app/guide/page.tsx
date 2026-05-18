import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '사용 가이드 — WhenMeets',
  description: 'WhenMeets 사용법, 시간 모드와 날짜 모드의 차이, 결과 히트맵 읽는 법, 비밀번호 옵션, 그리고 비슷한 도구(Timeful, When2meet)와의 차이까지 정리한 종합 가이드.',
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: '사용 가이드 — WhenMeets',
    description: '회원가입 없이 1분 만에 그룹 일정 조율 — 모든 사용법과 비교를 한 페이지에.',
    type: 'article',
  },
};

interface CellValue {
  value: string;
  positive: boolean;
}

interface ComparisonRow {
  label: string;
  whenmeets: CellValue;
  timeful: CellValue;
  when2meet: CellValue;
}

const COMMON_BASELINE = [
  '회원가입 없이 응답할 수 있음 (호스트도 가입 선택)',
  '한 화면에서 후보 날짜·시간을 입력하는 단일 폼 (step-by-step 위저드 없음)',
  '기본 사용 무료',
];

const COMPARISON_TABLE: ComparisonRow[] = [
  {
    label: '한국어 UI · 한글 요일/날짜 표기',
    whenmeets: { value: '기본', positive: true },
    timeful: { value: '영어 중심', positive: false },
    when2meet: { value: '영어 전용', positive: false },
  },
  {
    label: '모바일 친화 UI · 터치 드래그',
    whenmeets: { value: '최적화', positive: true },
    timeful: { value: '최적화', positive: true },
    when2meet: { value: '데스크탑 전용', positive: false },
  },
  {
    label: '현대적 UI 디자인',
    whenmeets: { value: '2026 디자인', positive: true },
    timeful: { value: '2024 디자인', positive: true },
    when2meet: { value: '10년+ 전 UI', positive: false },
  },
  {
    label: '카카오톡 인앱 브라우저 동작',
    whenmeets: { value: '동작 (입력 포커스 등 일부 개선 진행)', positive: true },
    timeful: { value: '제한적', positive: false },
    when2meet: { value: '제한적', positive: false },
  },
  {
    label: '그리드 셀별 가능 인원수 숫자 표시',
    whenmeets: { value: '표시', positive: true },
    timeful: { value: '미표시', positive: false },
    when2meet: { value: '미표시', positive: false },
  },
  {
    label: '색깔별 가능 인원수 범례',
    whenmeets: { value: '명시', positive: true },
    timeful: { value: '미제공', positive: false },
    when2meet: { value: '미제공', positive: false },
  },
  {
    label: '시간 없는 “날짜만” 모드',
    whenmeets: { value: '지원', positive: true },
    timeful: { value: '미지원', positive: false },
    when2meet: { value: '미지원', positive: false },
  },
  {
    label: '비밀번호로 응답 보호',
    whenmeets: { value: '지원', positive: true },
    timeful: { value: '미지원', positive: false },
    when2meet: { value: '미지원', positive: false },
  },
  {
    label: 'Google Calendar 양방향 동기화',
    whenmeets: { value: '미지원 (가져오기만)', positive: false },
    timeful: { value: '지원', positive: true },
    when2meet: { value: '미지원', positive: false },
  },
  {
    label: '대시보드 · 폴더로 이벤트 관리',
    whenmeets: { value: '지원', positive: true },
    timeful: { value: '제한적', positive: false },
    when2meet: { value: '미지원', positive: false },
  },
  {
    label: '오픈소스 라이선스',
    whenmeets: { value: 'MIT', positive: true },
    timeful: { value: 'AGPL', positive: true },
    when2meet: { value: '비공개', positive: false },
  },
  {
    label: '광고 노출',
    whenmeets: { value: '없음', positive: true },
    timeful: { value: '있음', positive: false },
    when2meet: { value: '있음', positive: false },
  },
];

export default function GuidePage() {
  return (
    <article className="w-full max-w-4xl mx-auto px-4 py-12 sm:py-16">
      <header className="mb-12">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal-600">
          Guide
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          WhenMeets 사용 가이드
        </h1>
        <p className="mt-4 text-base text-gray-600 leading-relaxed max-w-2xl">
          WhenMeets는 회원가입 없이 누구나 쓸 수 있는 한국어 기반 그룹 일정 조율 도구입니다.
          이 페이지에서는 기본 사용법, 두 가지 모드(시간/날짜), 결과 해석, 보안 옵션,
          그리고 Timeful·When2meet 같은 비슷한 도구와의 차이까지 한 번에 정리합니다.
        </p>
      </header>

      <nav className="mb-12 p-5 rounded-xl bg-gray-50 border border-gray-200">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">목차</h2>
        <ol className="grid gap-1.5 sm:grid-cols-2 text-sm text-gray-700">
          <li><a href="#quickstart" className="hover:text-teal-600">1. 빠른 시작 (1분)</a></li>
          <li><a href="#modes" className="hover:text-teal-600">2. 캘린더 모드 vs 요일 모드</a></li>
          <li><a href="#date-only" className="hover:text-teal-600">3. 시간 없는 “날짜만” 모드</a></li>
          <li><a href="#result" className="hover:text-teal-600">4. 결과 히트맵 읽기</a></li>
          <li><a href="#security" className="hover:text-teal-600">5. 비밀번호와 보안</a></li>
          <li><a href="#vs-timeful" className="hover:text-teal-600">6. Timeful · When2meet과의 차이</a></li>
        </ol>
      </nav>

      <section id="quickstart" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. 빠른 시작 (1분)</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          호스트(이벤트 만든 사람)와 응답자(참여자)의 동선이 분리되어 있습니다.
          호스트는 1분, 응답자는 30초면 끝나도록 설계되어 있습니다.
        </p>
        <ol className="flex flex-col gap-3 text-base text-gray-700 leading-relaxed">
          <li><span className="font-semibold">① 이벤트 만들기</span> — 홈에서 “이벤트 만들기”를 누르고 제목, 후보 날짜, 시간대를 입력합니다. 가능 시간 표시 방식(가능한 시간 vs 안 되는 시간)도 이때 선택할 수 있습니다.</li>
          <li><span className="font-semibold">② 링크 공유</span> — 만들기 직후 표시되는 링크를 카카오톡, 슬랙, 메신저, 이메일 어디든 복사해서 공유합니다. 응답자는 가입 없이 바로 들어옵니다.</li>
          <li><span className="font-semibold">③ 응답</span> — 각자 이름만 입력하고 가능한 시간을 드래그합니다. 모바일에서는 길게 눌러 드래그하면 한 번에 여러 슬랏 표시가 가능합니다.</li>
          <li><span className="font-semibold">④ 결과 확인</span> — 호스트와 응답자 모두 같은 페이지에서 실시간으로 결과 히트맵을 봅니다. 가장 진한 셀이 모두에게 가능한 시간입니다.</li>
        </ol>
      </section>

      <section id="modes" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. 캘린더 모드 vs 요일 모드</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-4">
          이벤트를 만들 때 후보 날짜를 두 가지 방식으로 입력할 수 있습니다. 어떤 모드를 쓸지는 모임의 성격에 따라 다릅니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-5 rounded-xl border border-gray-200 bg-white">
            <h3 className="text-base font-bold text-gray-900 mb-2">캘린더 모드 (특정 날짜)</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              구체적인 날짜를 콕 집어 후보로 받는 방식입니다. “7월 4일, 5일, 11일, 12일 중에서”처럼 특정 주말이나 연휴를 잡을 때 사용합니다.
              결혼식 후 동창회, 명절 가족 모임, 일회성 행사에 적합합니다.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-gray-200 bg-white">
            <h3 className="text-base font-bold text-gray-900 mb-2">요일 모드 (반복 가능 시간)</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              월·화·수·목·금·토·일 중에서 후보 요일만 표시합니다. “매주 가능한 요일과 시간”을 묻는 방식이라
              스터디 그룹, 동호회 정기 모임, 운동 파트너처럼 반복되는 일정에 적합합니다.
            </p>
          </div>
        </div>
      </section>

      <section id="date-only" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. 시간 없는 “날짜만” 모드</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          명절 연휴, 여행 일정, 종일 행사처럼 시간 단위가 의미 없는 경우엔 시간 슬랏 자체를 빼고
          “가능한 날짜”만 받을 수 있습니다. 이벤트 만들 때 “시간 없이 날짜만” 옵션을 켜면 됩니다.
        </p>
        <p className="text-base text-gray-700 leading-relaxed">
          응답 화면도 시간 그리드가 아니라 캘린더 그리드로 바뀝니다. 손가락 한 번에 한 날짜만 탭하면 되므로
          중장년층 가족 단톡방에서도 쉽게 응답할 수 있습니다.
          <Link href="/use-cases/family-holiday" className="ml-1 text-teal-600 hover:underline">
            추석 가족 모임 사례에서 실제 화면 보기
          </Link>
          .
        </p>
      </section>

      <section id="result" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. 결과 히트맵 읽기</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          결과 화면은 가능 인원에 따라 색의 진하기가 달라지는 히트맵입니다.
        </p>
        <ul className="flex flex-col gap-2 text-base text-gray-700 leading-relaxed pl-1">
          <li>· <span className="font-semibold">진한 청록색</span> — 모든 응답자가 가능한 시간. 약속 잡기에 가장 좋은 슬랏입니다.</li>
          <li>· <span className="font-semibold">옅은 청록색</span> — 한 명, 두 명이 안 되는 시간. 차선책으로 검토할 수 있습니다.</li>
          <li>· <span className="font-semibold">호박색 (If Needed)</span> — “꼭 필요하면 가능” 표시한 사람이 포함된 슬랏. 필요할 때 켜고 끌 수 있습니다.</li>
          <li>· <span className="font-semibold">회색</span> — 표시가 한 명도 없는 슬랏. 모임 후보에서 제외합니다.</li>
        </ul>
        <p className="mt-3 text-base text-gray-700 leading-relaxed">
          오른쪽 사이드바에서 응답자를 한 명씩 끄고 켜면, “이 사람만 빠지면 가능한 시간은?”을 즉시 확인할 수 있습니다.
        </p>
      </section>

      <section id="security" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. 비밀번호와 보안</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-3">
          이벤트는 기본적으로 “링크를 아는 사람만 접근”하는 비공개 페이지입니다.
          검색엔진 크롤러는 차단되어 있고, 링크가 노출되지 않는 한 외부에서 찾을 수 없습니다.
        </p>
        <p className="text-base text-gray-700 leading-relaxed">
          비밀번호 옵션을 켜면 “응답 수정” 단계에 인증을 추가할 수 있습니다.
          첫 응답 시 비밀번호를 설정하면 그 이후로는 같은 비밀번호로만 자기 응답을 수정할 수 있습니다.
          “누가 내 응답을 임의로 바꾸지 않을까” 걱정되는 공개 단톡방·동아리방에서 켜두면 좋습니다.
        </p>
      </section>

      <section id="vs-timeful" className="mb-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Timeful · When2meet과의 차이</h2>
        <p className="text-base text-gray-700 leading-relaxed mb-5">
          비슷한 그룹 일정 도구로 Timeful(구 Schej)과 When2meet이 잘 알려져 있습니다.
          셋 다 같은 “단톡방 일정 조율” 문제를 풀지만 접근법과 강조점이 다릅니다.
          광고 마케팅이 아니라 사실 기반으로 정직하게 비교한 표는 아래와 같습니다.
        </p>

        <div className="mb-6 p-5 rounded-xl border border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">셋 다 공통 — 기본 베이스라인</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-gray-600 leading-relaxed">
            {COMMON_BASELINE.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            아래 표에는 “차이가 있는 항목”만 정리합니다. 다른 일정 조율 도구들 중 상당수가
            여러 단계 위저드로 시간 입력을 나눠 받지만, 위 세 도구는 모두 한 화면에서 단번에 끝납니다.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm min-w-160">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">항목</th>
                <th className="px-4 py-3 font-semibold text-teal-700">WhenMeets</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Timeful</th>
                <th className="px-4 py-3 font-semibold text-gray-700">When2meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {COMPARISON_TABLE.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 text-gray-700">{row.label}</td>
                  <td className="px-4 py-3">
                    <span className={row.whenmeets.positive ? 'text-teal-700 font-medium' : 'text-gray-500'}>
                      {row.whenmeets.value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.timeful.positive ? 'text-teal-700 font-medium' : 'text-gray-500'}>
                      {row.timeful.value}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.when2meet.positive ? 'text-teal-700 font-medium' : 'text-gray-500'}>
                      {row.when2meet.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm text-gray-700 leading-relaxed">
          <div className="p-4 rounded-lg border border-teal-200 bg-teal-50">
            <p className="font-semibold text-teal-700 mb-1">WhenMeets가 빛나는 순간</p>
            <p>단톡방에서 빠르게 결정 내고 싶을 때. 모바일에서 그리드 셀별 인원수 숫자까지 보고 싶을 때. 명절 같은 날짜만 받으면 되는 모임에서.</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <p className="font-semibold text-gray-700 mb-1">Timeful이 빛나는 순간</p>
            <p>직장인 개인 일정 도구로 Google Calendar와 깊게 묶고 싶을 때. 영어 사용 그룹과 외국 동료들과의 일정 조율.</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 bg-white">
            <p className="font-semibold text-gray-700 mb-1">When2meet이 빛나는 순간</p>
            <p>“익숙한 도구” 그대로가 좋고, 데스크탑에서만 쓰는 그룹. 단순 시간 그리드 외 기능이 필요 없을 때.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-teal-200 bg-teal-50 p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          더 알아볼 필요 없이 1분 만에 시작
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-5">
          가이드를 다 안 읽어도 됩니다. 만들면서 익히는 게 가장 빠릅니다.
        </p>
        <div className="inline-flex flex-wrap items-center gap-3 justify-center">
          <Link
            href="/new"
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 transition-colors"
          >
            이벤트 만들기
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-teal-700 font-semibold rounded-md border border-teal-200 hover:bg-teal-100 transition-colors"
          >
            데모 화면 보기
          </Link>
        </div>
      </section>
    </article>
  );
}
