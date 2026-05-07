/**
 * Structured data (schema.org JSON-LD) for SEO + AI answer engines.
 * Rendered server-side as a <script type="application/ld+json"> tag in <head>.
 *
 * Includes:
 * - WebApplication: search engines, AI assistants, app directories
 * - Organization: brand entity for knowledge graphs
 * - WebSite (with potential SearchAction): sitelinks search box on Google
 * - FAQPage: surfaces in featured snippets and AI answer engines
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whenmeets.com';

const graph = [
  {
    '@type': 'WebApplication',
    '@id': `${SITE_URL}#webapp`,
    name: 'WhenMeets',
    description:
      '모바일에서도 편하게 쓰는 무료 그룹 일정 조율 서비스. 회원가입 없이 링크 공유와 시간 선택만으로 끝나는 when2meet의 한국어·모바일 친화 대안.',
    url: SITE_URL,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any (web-based)',
    inLanguage: 'ko-KR',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '회원가입 없이 링크 공유로 참여',
      '모바일 드래그 시간 선택 (15분 단위)',
      '되는 시간 / 안 되는 시간 두 가지 응답 모드',
      '캘린더 모드 + 요일 모드',
      'Google 캘린더 일정 가져오기',
      '결과 히트맵 시각화',
      '비밀번호 보호 이벤트',
    ],
  },
  {
    '@type': 'Organization',
    '@id': `${SITE_URL}#org`,
    name: 'WhenMeets',
    url: SITE_URL,
    sameAs: ['https://github.com/BORB-CHOI/whenmeets'],
  },
  {
    '@type': 'WebSite',
    '@id': `${SITE_URL}#site`,
    url: SITE_URL,
    name: 'WhenMeets',
    inLanguage: 'ko-KR',
    publisher: { '@id': `${SITE_URL}#org` },
  },
  {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'WhenMeets는 회원가입이 필요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            '아니요. 이벤트 생성과 참여 모두 회원가입 없이 가능합니다. Google 로그인은 선택이며, 로그인 시 내 이벤트를 대시보드에서 관리할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'WhenMeets는 무료인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            '네, 무료입니다. 운영 비용 충당을 위해 광고가 표시될 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'when2meet과 어떻게 다른가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'when2meet의 핵심 워크플로(링크 공유 + 시간 드래그)를 유지하면서 모바일 터치 최적화, 한국어 UI, 안 되는 시간 모드, 정기 모임용 요일 모드, Google 캘린더 연동을 추가했습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '데이터는 어디에 저장되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Supabase(Postgres) 호스팅. 이벤트 데이터는 생성자가 삭제하거나 마지막 날짜 기준 일정 기간이 지나면 자동 비활성화될 수 있습니다.',
        },
      },
    ],
  },
];

export default function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}
