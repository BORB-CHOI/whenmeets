/**
 * Renders the AdSense site-verification meta tag.
 *
 * Equivalent to AdSense's "메타 태그" verification option:
 *   <meta name="google-adsense-account" content="ca-pub-XXXXXXXX">
 *
 * Pure SSR HTML (no JS), so AdSense's verification crawler always sees it.
 * Coexists with <AdSenseScript /> — the script does verification + ad
 * serving, the meta is the most reliable fallback for verification alone.
 * Both are gated on NEXT_PUBLIC_ADSENSE_CLIENT.
 */
export default function AdSenseMeta() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return <meta name="google-adsense-account" content={client} />;
}
