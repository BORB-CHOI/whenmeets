'use client';

import { useEffect, useRef } from 'react';

interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single AdSense ad unit. Pushes once on mount; bails out silently if the
 * AdSense loader hasn't initialized yet (push throws synchronously). Renders
 * nothing if NEXT_PUBLIC_ADSENSE_CLIENT is missing.
 */
export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  className,
  style,
}: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
      pushed.current = true;
    } catch {
      // AdSense not yet ready — script load is async; the loader will
      // process queued <ins> elements when it initializes.
    }
  }, [client]);

  if (!client) return null;

  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
