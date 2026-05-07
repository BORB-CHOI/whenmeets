/**
 * Google Analytics 4 (GA4) loader.
 * Renders nothing if NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured.
 *
 * Measurement ID format: "G-XXXXXXXXXX" (the new GA4 property ID, NOT the
 * legacy "UA-..." Universal Analytics ID — that platform was sunset 2023).
 *
 * Uses plain <script> tags rendered into <head> server-side so Google Search
 * Console's GA-based ownership verification can locate the tag. next/script
 * with `afterInteractive` injects at the end of <body>, which causes the
 * "사이트의 Google 애널리틱스 추적 코드가 페이지에서 잘못된 위치에 있습니다" error.
 */
export default function GoogleAnalyticsScript() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;
  const initScript = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { anonymize_ip: true });`;
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script dangerouslySetInnerHTML={{ __html: initScript }} />
    </>
  );
}
