import type { NextConfig } from "next";

/**
 * Baseline security headers. Applied to every response.
 *
 * Notes:
 * - CSP intentionally omitted — AdSense + Google Analytics + Microsoft Clarity
 *   require inline scripts/styles + many third-party origins. A correct CSP
 *   needs a nonce pipeline that the current stack doesn't have wired up.
 *   Tracked in docs/SECURITY.md.
 * - HSTS preload is conservative (1 year, no preload) so we can roll back if
 *   needed. Promote to `preload` once we've verified all subdomains are HTTPS.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
