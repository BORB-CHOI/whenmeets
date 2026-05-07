import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import QueryProvider from '@/components/providers/QueryProvider';
import AdSenseScript from '@/components/ads/AdSenseScript';
import AdSenseMeta from '@/components/ads/AdSenseMeta';
import FloatingAds from '@/components/ads/FloatingAds';
import JsonLd from '@/components/seo/JsonLd';
import ClarityScript from '@/components/analytics/ClarityScript';
import GoogleAnalyticsScript from '@/components/analytics/GoogleAnalyticsScript';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whenmeets.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
    template: '%s · WhenMeets',
  },
  description: '모바일에서도 편하게 쓰는 무료 그룹 일정 조율 서비스. 회원가입 없이 링크 공유하고 시간만 고르면 끝나는 when2meet의 한국어·모바일 친화 대안.',
  keywords: ['일정 조율', '모임 시간', '그룹 일정', 'when2meet', '미팅 잡기', '약속 시간', '캘린더 공유'],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
    description: '회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.',
    siteName: 'WhenMeets',
    url: SITE_URL,
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WhenMeets - 쉽고 빠른 그룹 일정 조율',
    description: '회원가입 필요 없음. 링크 공유하고, 시간 고르면 끝.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
        <JsonLd />
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
        <ClarityScript />
        <GoogleAnalyticsScript />
      </body>
    </html>
  );
}
