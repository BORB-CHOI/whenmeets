import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute w-125 h-125 rounded-[40%_60%_55%_45%/55%_40%_60%_45%] opacity-45"
          style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            top: '-10%',
            left: '-5%',
            animation: 'blob1 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-112.5 h-112.5 rounded-[55%_45%_40%_60%/45%_55%_45%_55%] opacity-50"
          style={{
            background: 'linear-gradient(225deg, #7C3AED, #4F46E5)',
            top: '30%',
            right: '-10%',
            animation: 'blob2 16s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-100 h-100 rounded-[45%_55%_60%_40%/60%_45%_55%_40%] opacity-45"
          style={{
            background: 'linear-gradient(315deg, #4F46E5, #8B5CF6)',
            bottom: '-5%',
            left: '20%',
            animation: 'blob3 18s ease-in-out infinite',
          }}
        />
        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-[50px]" />
      </div>

      {/* Hero content with staggered entrance */}
      <h1
        className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900"
        style={{ animation: 'fadeInUp 0.6s ease-out both' }}
      >
        WhenMeets
      </h1>
      <p
        className="mt-3 text-lg text-gray-500 text-center max-w-xs"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
      >
        모바일에서도 편하게 쓰는 그룹 일정 조율. 무료 오픈소스.
      </p>
      <Link
        href="/new"
        className="mt-8 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] transition-all text-lg"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
      >
        일정 만들기
      </Link>
      <p
        className="mt-12 text-xs text-gray-400"
        style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
      >
        회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.
      </p>

      {/* Keyframe styles */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
          33% { transform: translate(30px, -40px) rotate(120deg) scale(1.1); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-20px, 30px) rotate(240deg) scale(0.95); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          33% { transform: translate(-40px, 20px) rotate(-120deg) scale(1.05); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
          66% { transform: translate(25px, -35px) rotate(-240deg) scale(1.1); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); border-radius: 45% 55% 60% 40% / 60% 45% 55% 40%; }
          33% { transform: translate(35px, 25px) rotate(90deg) scale(0.95); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          66% { transform: translate(-30px, -20px) rotate(180deg) scale(1.05); border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
