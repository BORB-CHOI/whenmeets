import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 - WhenMeets',
  description: 'WhenMeets 이용약관',
};

const LAST_UPDATED = '2026-05-07';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">이용약관</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">최종 업데이트: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제1조 (목적)</h2>
          <p>본 약관은 WhenMeets(이하 &ldquo;서비스&rdquo;)가 제공하는 그룹 일정 조율 도구의 이용 조건과 절차,
            서비스와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다. 서비스는 오픈소스 프로젝트로
            운영되며, 비영리·무상으로 제공됩니다(광고 수익은 운영 비용 충당 목적).</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제2조 (정의)</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li><strong>이벤트:</strong> 이용자가 생성하는 일정 후보군과 그에 대한 참여자 응답의 묶음.</li>
            <li><strong>이벤트 생성자:</strong> 이벤트를 생성하고 수정·삭제 권한을 갖는 이용자.</li>
            <li><strong>참여자:</strong> 이벤트 링크로 접속하여 시간을 응답하는 이용자.</li>
            <li><strong>회원:</strong> Google 계정으로 로그인하여 자신의 이벤트 기록을 관리하는 이용자.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제3조 (약관의 효력 및 변경)</h2>
          <p>본 약관은 서비스 이용을 시작한 시점부터 효력이 발생합니다. 서비스는 관련 법령을 위반하지 않는 범위에서
            본 약관을 개정할 수 있으며, 변경된 약관은 서비스 내 공지 또는 GitHub 저장소를 통해 시행 7일 전부터
            안내합니다. 다만 이용자에게 불리한 변경의 경우 30일 전부터 안내하며, 시행 후에도 계속 사용하는 경우
            변경에 동의한 것으로 간주합니다.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제4조 (서비스 제공)</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>서비스는 24시간 제공함을 원칙으로 하나, 점검·장애·외부 요인 등으로 일시 중단될 수 있습니다.</li>
            <li>서비스는 운영상·기술상 사유로 일부 기능을 변경, 추가 또는 종료할 수 있습니다.</li>
            <li>서비스는 무상으로 제공되며, 가용성·정확성·적합성에 대한 명시적·묵시적 보증을 하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제5조 (이용자의 의무)</h2>
          <p className="mb-2">이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>타인의 개인정보를 도용하거나 허위 정보를 입력하는 행위</li>
            <li>법령·공서양속에 위반되는 정보(욕설, 차별, 음란, 폭력 등)를 게시하는 행위</li>
            <li>타인의 권리를 침해하거나 명예를 훼손하는 행위</li>
            <li>자동화된 수단으로 서비스에 비정상적 부하를 가하거나 데이터를 수집하는 행위</li>
            <li>서비스의 보안을 우회하거나 취약점을 악용하는 행위</li>
            <li>서비스를 영리 목적으로 무단 재판매·재배포하는 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제6조 (콘텐츠와 데이터)</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>이용자가 입력한 이벤트 제목, 설명, 응답 시간 등의 콘텐츠에 대한 권리는 이용자 본인에게
              귀속됩니다.</li>
            <li>이용자는 서비스 제공에 필요한 범위 내에서 해당 콘텐츠를 저장·표시·전송할 수 있는 비독점적 사용권을
              서비스에 부여합니다.</li>
            <li>이벤트 링크를 알고 있는 모든 사람은 해당 이벤트의 응답을 열람할 수 있으므로, 민감한 정보는
              입력하지 마십시오.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제7조 (책임 제한)</h2>
          <ul className="list-disc pl-6 flex flex-col gap-1.5">
            <li>서비스는 천재지변, 전쟁, 통신 두절 등 불가항력 사유로 발생한 손해에 대해 책임지지 않습니다.</li>
            <li>서비스는 이용자의 귀책 사유로 인한 서비스 이용 장애나 데이터 손실에 대해 책임지지 않습니다.</li>
            <li>서비스는 이용자가 서비스를 통해 약속한 일정의 이행 여부, 참여자 간 분쟁에 대해 책임지지 않습니다.</li>
            <li>법령상 허용되는 최대 범위에서, 서비스의 직·간접·우발적·결과적 손해에 대한 배상 책임을 지지
              않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제8조 (이용 제한 및 종료)</h2>
          <p>서비스는 이용자가 본 약관 또는 관련 법령을 위반하는 경우 사전 통지 없이 해당 이벤트·계정의 이용을
            제한하거나 데이터를 삭제할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제9조 (광고)</h2>
          <p>서비스 운영 비용 충당을 위해 Google AdSense 등 외부 광고가 표시될 수 있습니다. 광고 콘텐츠와 광고를
            통한 거래는 해당 광고주의 책임이며, 서비스는 매개 외 별도 책임을 지지 않습니다.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제10조 (준거법 및 분쟁 해결)</h2>
          <p>본 약관의 해석 및 서비스 이용과 관련한 분쟁은 대한민국 법령에 따르며, 분쟁이 발생할 경우 민사소송법
            상 관할 법원을 1심 법원으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">제11조 (문의)</h2>
          <p>
            본 약관에 대한 문의나 이의 제기는{' '}
            <a
              href="https://github.com/BORB-CHOI/whenmeets/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              GitHub Issues
            </a>
            를 통해 접수해주세요.
          </p>
        </section>
      </div>
    </div>
  );
}
