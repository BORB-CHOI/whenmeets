import Script from 'next/script';

/**
 * Microsoft Clarity (free heatmaps + session recordings).
 * Renders nothing if NEXT_PUBLIC_CLARITY_PROJECT_ID is not configured.
 *
 * Project ID is the alphanumeric token Clarity gives you (e.g. "abc1234567"),
 * not the full embed snippet. Loaded with `afterInteractive` so it never
 * blocks page interactivity.
 */
export default function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;
  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
    >
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${projectId}");`}
    </Script>
  );
}
