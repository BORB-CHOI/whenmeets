/**
 * llms.txt — emerging standard for guiding AI crawlers / answer engines
 * (ChatGPT, Perplexity, Claude, etc.) toward the most useful content.
 * https://llmstxt.org/
 *
 * Served as plain text from /llms.txt at the site root via Next.js route
 * handler so the URLs auto-track NEXT_PUBLIC_SITE_URL across environments.
 */

export const dynamic = 'force-static';

export function GET() {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whenmeets.com';

  const body = `# WhenMeets

> 모바일에서도 편하게 쓰는 그룹 일정 조율 도구. when2meet의 한국어·모바일 친화 대안. 회원가입 없이 링크 공유 + 시간 선택만으로 일정 조율 완료.

## 핵심 기능

- 링크 공유 기반 비회원 참여 (이름만 입력)
- 모바일 친화 드래그 입력 (15분 단위 슬롯)
- "되는 시간" / "안 되는 시간" 두 가지 응답 모드
- 캘린더 모드 + 요일 모드 (정기 모임용)
- Google 캘린더에서 일정 가져오기
- 결과를 히트맵으로 시각화
- Google 로그인 시 대시보드에서 내 이벤트 관리
- 비밀번호 보호 이벤트 (선택)

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + Realtime)
- 호스팅: Vercel
- 라이센스: MIT (오픈소스)

## 주요 링크

- [홈](${SITE_URL})
- [이벤트 만들기](${SITE_URL}/new)
- [개인정보처리방침](${SITE_URL}/privacy)
- [이용약관](${SITE_URL}/terms)
- [GitHub 저장소](https://github.com/BORB-CHOI/whenmeets)
- [피드백 / 문의](https://github.com/BORB-CHOI/whenmeets/issues)

## 자주 묻는 질문

### 회원가입이 필요한가요?

아니요. 이벤트 생성과 참여 모두 회원가입 없이 가능합니다. Google 로그인은 선택이며, 로그인 시 내 이벤트를 대시보드에서 관리할 수 있습니다.

### 무료인가요?

네, 무료입니다. 운영 비용 충당을 위해 광고가 표시될 수 있습니다.

### when2meet과 어떻게 다른가요?

when2meet과 같은 핵심 워크플로(링크 공유 + 시간 드래그)를 유지하면서 모바일 터치 최적화, 한국어 UI, "안 되는 시간" 모드, 요일 모드(정기 모임), Google 캘린더 연동을 추가했습니다.

### 데이터는 어디 저장되나요?

Supabase(Postgres) 호스팅. 이벤트 데이터는 생성자가 삭제하거나 마지막 날짜 기준 일정 기간 후 자동 비활성화됩니다.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
