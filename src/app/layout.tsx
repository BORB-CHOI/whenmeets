import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import QueryProvider from '@/components/providers/QueryProvider';
import AdSenseScript from '@/components/ads/AdSenseScript';
import AdSenseMeta from '@/components/ads/AdSenseMeta';
import FloatingAds from '@/components/ads/FloatingAds';
import './globals.css';

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
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <AdSenseMeta />
      </head>
      <body
        className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
        style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <QueryProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <FloatingAds />
          </QueryProvider>
        </ThemeProvider>
        <AdSenseScript />
      </body>
    </html>
  );
}
