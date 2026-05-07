/**
 * IAB ads.txt — Authorized Digital Sellers
 * https://iabtechlab.com/ads-txt/
 *
 * Served from /ads.txt at the site root via Next.js route handler so the
 * publisher ID stays in env vars (not committed) and stays in sync with
 * <AdSenseScript />. If NEXT_PUBLIC_ADSENSE_CLIENT is not configured the
 * route 404s, signaling to crawlers that no ads.txt is published.
 */

const GOOGLE_TAG_ID = 'f08c47fec0942fa0'; // Fixed Google ads certification authority ID per IAB.

export const dynamic = 'force-static';

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) {
    return new Response('Not found', { status: 404 });
  }

  // ads.txt expects the publisher id WITHOUT the "ca-" prefix that the
  // AdSense loader URL uses (i.e. "pub-XXX..." not "ca-pub-XXX...").
  const publisherId = client.replace(/^ca-/, '');
  const body = `google.com, ${publisherId}, DIRECT, ${GOOGLE_TAG_ID}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
