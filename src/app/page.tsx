import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold tracking-tight">WhenMeets</h1>
      <p className="mt-3 text-lg text-gray-500 text-center max-w-xs">
        모바일에서도 편하게 쓰는 그룹 일정 조율. 무료 오픈소스.
      </p>
      <Link
        href="/new"
        className="mt-8 px-8 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors text-lg"
      >
        일정 만들기
      </Link>
      <p className="mt-12 text-xs text-gray-300">
        회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.
      </p>
    </div>
  );
}
