import Script from 'next/script';

/**
 * Loads the Google AdSense loader script. Renders nothing if
 * NEXT_PUBLIC_ADSENSE_CLIENT is not configured, so production deploys without
 * an AdSense account stay clean.
 *
 * Uses `beforeInteractive` so the <script> appears in the initial SSR HTML
 * (visible in View Source). AdSense's site-verification crawler typically
 * fetches HTML without executing JS, so `afterInteractive` (which injects the
 * tag dynamically post-hydration) makes verification fail with "snippet not
 * found" even when the loader is configured correctly.
 */
export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsense-loader"
      async
      strategy="beforeInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
