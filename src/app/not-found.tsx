import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold text-gray-200">404</h1>
      <p className="mt-2 text-gray-500">이벤트를 찾을 수 없습니다.</p>
      <Link href="/" className="mt-4 text-indigo-600 hover:underline">
        새 이벤트 만들기
      </Link>
    </div>
  );
}
