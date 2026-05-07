import Script from 'next/script';

/**
 * Loads the Google AdSense loader script. Renders nothing if
 * NEXT_PUBLIC_ADSENSE_CLIENT is not configured, so production deploys without
 * an AdSense account stay clean.
 */
export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      id="adsense-loader"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
