/**
 * Microsoft Clarity (free heatmaps + session recordings).
 * Renders nothing if NEXT_PUBLIC_CLARITY_PROJECT_ID is not configured.
 *
 * Project ID is the alphanumeric token Clarity gives you (e.g. "abc1234567"),
 * not the full embed snippet.
 *
 * Uses a plain <script> tag rendered into <head> server-side, matching the
 * AdSense and GA4 loaders so all third-party tags load from the same place.
 */
export default function ClarityScript() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;
  const inline = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${projectId}");`;
  return <script dangerouslySetInnerHTML={{ __html: inline }} />;
}
