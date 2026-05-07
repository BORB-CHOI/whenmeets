import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침 - WhenMeets',
  description: 'WhenMeets 개인정보처리방침',
};

const LAST_UPDATED = '2026-05-07';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">개인정보처리방침</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">최종 업데이트: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <section>
          <p>
            WhenMeets(이하 &ldquo;서비스&rdquo;)는 회원가입 없이 누구나 이용 가능한 그룹 일정 조율 도구이며,
            이용자의 개인정보를 소중히 다루기 위해 본 방침을 마련합니다. 본 서비스는 오픈소스 프로젝트로
            개인 운영자가 운영하며, 소스 코드는{' '}
            <a
              href="https://github.com/BORB-CHOI/whenmeets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              GitHub 저장소
            </a>
            에서 공개 검증할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">1. 수집하는 개인정보 항목</h2>
          <p className="mb-2">서비스는 다음과 같은 정보를 수집할 수 있습니다.</p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>
              <strong>비회원 참여 시:</strong> 이용자가 직접 입력한 표시 이름, 응답 시간표, 선택적으로 설정한
              참여자 비밀번호(저장 시 bcrypt 해시로만 보관, 평문 저장 안 함).
            </li>
            <li>
              <strong>Google 계정 로그인 시:</strong> Google이 제공하는 이메일, 표시 이름, 프로필 이미지 URL.
              명시적으로 캘린더 권한을 부여한 경우 임시 액세스 토큰으로 캘린더 일정을 조회하지만, 캘린더 데이터를
              서버에 저장하지 않습니다.
            </li>
            <li>
              <strong>자동 수집 정보:</strong> 세션 유지를 위한 쿠키, 이벤트별 비밀번호 인증 토큰 쿠키, 접속
              IP 등 표준 HTTP 메타데이터.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">2. 이용 목적</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>이벤트 생성·참여·결과 표시 등 서비스 제공</li>
            <li>참여자 식별 및 응답 충돌 방지</li>
            <li>비밀번호 보호 이벤트의 인증 유지</li>
            <li>광고 표시 및 부정 사용 방지(아래 8항 참조)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">3. 보유 및 파기</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>
              <strong>이벤트 데이터:</strong> 이벤트 생성자가 삭제하거나, 이벤트의 마지막 날짜로부터 일정 기간이
              지나면 자동으로 비활성화/삭제될 수 있습니다.
            </li>
            <li>
              <strong>계정 데이터:</strong> 계정 삭제 요청 시 즉시 삭제합니다. 일부 백업/감사 로그는 법적 보유
              기간이 끝날 때까지 보관될 수 있습니다.
            </li>
            <li>
              <strong>쿠키:</strong> 만료 시점 도달 시 자동 삭제됩니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">4. 처리 위탁 및 제3자 제공</h2>
          <p className="mb-2">서비스 제공을 위해 다음 사업자에게 처리를 위탁합니다.</p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>
              <strong>Supabase, Inc.</strong> — 데이터베이스, 인증(OAuth), 파일 저장 호스팅. 서버는 위탁사가
              지정한 리전에서 운영됩니다.
            </li>
            <li>
              <strong>Vercel, Inc.</strong> — 웹 애플리케이션 호스팅 및 엣지 네트워크.
            </li>
            <li>
              <strong>Google LLC</strong> — Google 로그인(OAuth), Google AdSense 광고 표시.
            </li>
          </ul>
          <p className="mt-2">위탁 사업자는 본 방침과 동일한 수준의 보호 조치를 적용해야 하며, 별도의 동의
            없이는 그 외 제3자에게 개인정보를 제공하지 않습니다(법령에 의거한 경우 제외).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">5. 쿠키 사용</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li><strong>필수 쿠키:</strong> 로그인 세션 유지, 비밀번호 보호 이벤트 접근 토큰.</li>
            <li>
              <strong>광고/측정 쿠키:</strong> Google AdSense 등 제3자 광고 사업자가 사용자에게 관련성 높은 광고를
              제공하기 위해 쿠키를 설정할 수 있습니다. 이용자는{' '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                Google 광고 설정
              </a>{' '}
              또는 브라우저 설정에서 이를 차단할 수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">6. 이용자의 권리</h2>
          <p className="mb-2">이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>본인의 개인정보 열람 요청</li>
            <li>오류가 있는 개인정보의 정정 요청</li>
            <li>본인의 개인정보 삭제 요청</li>
            <li>본인의 개인정보 처리 정지 요청</li>
          </ul>
          <p className="mt-2">권리 행사는 아래 9항의 연락처로 요청할 수 있으며, 본인 확인 절차를 거쳐 지체 없이
            조치합니다.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">7. 개인정보 보호를 위한 기술적·관리적 조치</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>비밀번호는 평문 대신 bcrypt 해시로 저장합니다.</li>
            <li>전 통신 구간을 HTTPS로 암호화합니다.</li>
            <li>데이터베이스 접근은 서비스 전용 자격 증명으로 제한합니다.</li>
            <li>최소 수집 원칙에 따라 서비스 운영에 불필요한 정보는 요구하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">8. 광고 및 분석</h2>
          <p>
            본 서비스에는 Google AdSense를 통한 광고가 표시될 수 있습니다. Google 및 그 파트너는 쿠키 등 표준
            웹 기술을 사용하여 광고 게재를 최적화합니다. 자세한 내용은{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              Google 광고 정책
            </a>
            을 참고해주세요.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">9. 연락처</h2>
          <p className="mb-2">개인정보 관련 문의 및 권리 행사는 다음 채널로 보내주세요.</p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>
              GitHub Issues:{' '}
              <a
                href="https://github.com/BORB-CHOI/whenmeets/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                github.com/BORB-CHOI/whenmeets/issues
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">10. 방침 변경</h2>
          <p>본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 중요한 변경 시 서비스 내 공지 또는 GitHub
            저장소를 통해 사전 안내합니다. 변경 이력은 페이지 상단의 최종 업데이트 날짜로 확인할 수 있습니다.</p>
        </section>
      </div>
    </div>
  );
}
