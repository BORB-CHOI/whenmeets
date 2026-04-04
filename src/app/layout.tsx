import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whenmeets.com';

export const metadata: Metadata = {
  title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
  description: '모바일에서도 편하게 쓰는 무료 그룹 일정 조율 서비스. when2meet의 현대적 대안.',
  openGraph: {
    title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
    description: '회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.',
    siteName: 'WhenMeets',
    url: SITE_URL,
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary',
    title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
    description: '회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
