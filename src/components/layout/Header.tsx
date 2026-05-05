import Link from 'next/link';
import AuthButton from '@/components/auth/AuthButton';
import CreateEventButton from './CreateEventButton';
import HeaderDashboardLink from './HeaderDashboardLink';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 sm:h-16">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100 hover:text-teal-600 transition-colors cursor-pointer py-2"
          >
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#00897B" />
              <path d="M7 10h3l3.5 9.5L17 12l3.5 7.5L24 10h3l-5.5 14h-2.5L16 17l-3 7H10.5L7 10z" fill="white" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">WhenMeets</span>
          </Link>
          <HeaderDashboardLink />
        </div>

        {/* Right: Create + Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CreateEventButton />
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
