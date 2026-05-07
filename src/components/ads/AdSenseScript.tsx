/**
 * Renders the AdSense loader script — the EXACT snippet AdSense gives you,
 * placed directly in <head>. No `next/script` abstraction.
 *
 * Why plain <script> instead of next/script:
 * - next/script with `afterInteractive` injects the tag dynamically post-hydration,
 *   so it's not in the SSR HTML the AdSense crawler reads.
 * - next/script with `beforeInteractive` is supposed to be hoisted to <head>,
 *   but in Next.js 16 + React 19 the behavior interacts badly with the App Router's
 *   metadata pipeline and the script can end up in a place AdSense doesn't see.
 * - The plain <script> tag is the verbatim snippet AdSense provides, rendered
 *   server-side inside the layout's <head>. Visible in View Source. AdSense's
 *   "코드 삽입했습니다" verification picks it up reliably.
 *
 * Renders nothing if NEXT_PUBLIC_ADSENSE_CLIENT is not configured.
 */
export default function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
