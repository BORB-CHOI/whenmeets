import Link from 'next/link';
import Logo from '@/components/brand/Logo';
import AuthButton from '@/components/auth/AuthButton';
import CreateEventButton from './CreateEventButton';
import HeaderDashboardLink from './HeaderDashboardLink';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 sm:h-16">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900 hover:text-teal-600 transition-colors cursor-pointer py-2"
          >
            <Logo className="w-7 h-7 shrink-0" />
            <span className="hidden sm:inline">DayMeet</span>
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
