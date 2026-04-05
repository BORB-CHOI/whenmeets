'use client';

import { useState, useEffect } from 'react';

/**
 * AdSense placeholder banner.
 * In development: shows a subtle gray placeholder.
 * In production: would load adsbygoogle.js and render an ad unit.
 *
 * Google AdSense script will be injected here when the account is approved.
 */
export default function AdBanner() {
  const [mounted, setMounted] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Don't show ads inside iframes
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  // Lazy render: only after the page is interactive
  if (!mounted || inIframe) return null;

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return (
      <div className="w-full my-6 flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8">
        <span className="text-xs text-gray-300">Ad Placeholder</span>
      </div>
    );
  }

  // Production: AdSense container
  // TODO: Replace data-ad-client and data-ad-slot with actual values
  return (
    <div className="w-full my-6">
      {/* Google AdSense script will be injected here */}
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="XXXXXXXXXX"
      />
    </div>
  );
}
