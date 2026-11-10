import { conversionNames } from '@/lib/measurement';

export const dynamic = 'force-static';

export function GET() {
  const pixelId = process.env.NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID || '';
  const debug = process.env.NEXT_PUBLIC_MEASUREMENT_DEBUG === 'true';
  const enabled = process.env.NEXT_PUBLIC_MEASUREMENT_ENABLED === 'true' && (process.env.NODE_ENV === 'production' || debug) && /^[a-zA-Z0-9_-]{1,128}$/.test(pixelId);
  const script = enabled ? String.raw`<script>
(function(config) {
  if (window.parent === window) return;
  if (!window.oaiq) {
    var queue = function() { queue.q.push(Array.from(arguments)); };
    queue.q = [];
    window.oaiq = queue;
    queue('consent', false);
    queue('init', { pixelId: config.pixelId, debug: config.debug });
    var sdk = document.createElement('script');
    sdk.async = true;
    sdk.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
    document.head.appendChild(sdk);
  }
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    var packet = event.data;
    if (!packet || packet.type !== 'daymeet-pixel-command' || !Array.isArray(packet.args) || packet.args.length < 2 || packet.args.length > 4) return;
    var command = packet.args[0], name = packet.args[1], data = packet.args[2], options = packet.args[3];
    var pixel = window.oaiq;
    if (command === 'consent' && typeof name === 'boolean') {
      if (!name && Array.isArray(pixel.q)) {
        var initialization = pixel.q.filter(function(args) { return args[0] === 'init'; });
        pixel.q.splice(0, pixel.q.length, ['consent', false], ...initialization);
      }
      pixel('consent', name);
      return;
    }
    if (command !== 'measure') return;
    if (name === 'page_viewed') {
      pixel('measure', 'page_viewed', { type: 'contents' }, { opt_out: true });
      return;
    }
    if (name !== 'custom' || !data || data.type !== 'custom' || !options || options.opt_out !== true) return;
    if (!config.events.includes(options.custom_event_name) || typeof options.event_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.event_id)) return;
    pixel('measure', 'custom', { type: 'custom' }, { custom_event_name: options.custom_event_name, event_id: options.event_id, opt_out: true });
  });
  window.parent.postMessage({ type: 'daymeet-pixel-ready' }, window.location.origin);
})(${JSON.stringify({ pixelId, debug, events: conversionNames })});
</script>` : '';
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>DayMeet 측정</title>${script}</head><body></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'SAMEORIGIN' },
  });
}
