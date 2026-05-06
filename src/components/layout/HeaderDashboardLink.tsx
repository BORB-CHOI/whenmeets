'use client';

import Link from 'next/link';
import { useAuthUser } from '@/hooks/useAuthUser';

export default function HeaderDashboardLink() {
  const { user } = useAuthUser();

  if (!user) return null;

  return (
    <Link
      href="/dashboard"
      className="inline text-base font-semibold text-gray-600 dark:text-gray-300 hover:text-teal-600 transition-colors relative group cursor-pointer sm:text-[15px]"
    >
      대시보드
      <span className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-teal-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
    </Link>
  );
}
