import Script from 'next/script';

/**
 * Google Analytics 4 (GA4) loader.
 * Renders nothing if NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured.
 *
 * Measurement ID format: "G-XXXXXXXXXX" (the new GA4 property ID, NOT the
 * legacy "UA-..." Universal Analytics ID — that platform was sunset 2023).
 * Loaded with `afterInteractive` so it never blocks page interactivity.
 */
export default function GoogleAnalyticsScript() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;
  return (
    <>
      <Script
        id="ga4-loader"
        async
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', {
  anonymize_ip: true,
});`}
      </Script>
    </>
  );
}
