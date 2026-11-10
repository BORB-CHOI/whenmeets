import { measurementContextSchema, type StoredConversion } from '@/lib/measurement';

export function buildChatGptConversion(event: StoredConversion, sourceUrl: string) {
  const oppref = measurementContextSchema.shape.oppref.safeParse(event.context.oppref);
  const obref = measurementContextSchema.shape.obref.safeParse(event.context.obref);
  return {
    id: event.id,
    type: 'custom',
    custom_event_name: event.name,
    timestamp_ms: Date.parse(event.occurred_at),
    action_source: 'web',
    source_url: new URL(sourceUrl).origin,
    ...(oppref.success && oppref.data !== undefined && { oppref: oppref.data }),
    ...(obref.success && obref.data !== undefined && { user: { obref: obref.data } }),
    opt_out: true,
    data: { type: 'custom' },
  };
}

export async function sendChatGptConversions(events: StoredConversion[]): Promise<boolean> {
  const pixelId = process.env.NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID;
  const apiKey = process.env.CHATGPT_ADS_API_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.MEASUREMENT_ENABLED !== 'true' || !pixelId || !apiKey || !siteUrl) return false;
  if (['development', 'preview'].includes(process.env.VERCEL_ENV || process.env.NODE_ENV || '') && process.env.NEXT_PUBLIC_MEASUREMENT_DEBUG !== 'true') return false;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(pixelId)) return false;
  const eligible = events.filter((event) => event.context.consent === true);
  if (eligible.length === 0) return false;
  try {
    const response = await fetch(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(pixelId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ integration_source: 'daymeet', validate_only: process.env.CHATGPT_ADS_VALIDATE_ONLY === 'true', events: eligible.map((event) => buildChatGptConversion(event, siteUrl)) }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch { return false; }
}
