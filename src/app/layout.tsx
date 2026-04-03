import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
  description: '모바일에서도 편하게 쓰는 무료 그룹 일정 조율 서비스. when2meet의 현대적 대안.',
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
