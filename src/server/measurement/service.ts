import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { conversionNames, measurementContextSchema, measurementPropertiesSchema, normalizeMeasurementPath, type ConversionReceipt, type MeasurementContext, type StoredConversion } from '@/lib/measurement';
import { sendChatGptConversions } from './chatgpt-ads';
import { MEASUREMENT_COOKIES } from '@/lib/constants';

export const measurementEnabled = () => process.env.MEASUREMENT_ENABLED === 'true' && (
  !['development', 'preview'].includes(process.env.VERCEL_ENV || process.env.NODE_ENV || '') || process.env.NEXT_PUBLIC_MEASUREMENT_DEBUG === 'true'
);

export function readMeasurementVisitor(req: NextRequest): string | null {
  const value = req.cookies.get(MEASUREMENT_COOKIES.visitor)?.value;
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function readMeasurementContext(req: NextRequest): MeasurementContext | null {
  if (req.cookies.get(MEASUREMENT_COOKIES.consent)?.value !== 'granted') return null;
  try {
    const raw = req.headers.get('x-daymeet-measurement');
    if (!raw || raw.length > 4096) return null;
    const parsed = measurementContextSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export async function collectConversions(req: NextRequest, scheduleId: string, name: 'event_created' | 'availability_first_submitted', startedAt: number, participantId?: string): Promise<ConversionReceipt[]> {
  if (!measurementEnabled()) return [];
  const visitor = readMeasurementVisitor(req);
  const context = readMeasurementContext(req);
  if (!visitor || !context) return [];
  try {
    const db = createServerClient();
    const signal = AbortSignal.timeout(1000);
    const key = name === 'event_created' ? `created:${scheduleId}` : `submitted:${participantId}`;
    const [consent, { data: row, error }] = await Promise.all([
      db.from('measurement_visitors').select('consent').eq('id', visitor).abortSignal(signal).maybeSingle(),
      db.from('measurement_events').select('id, name, occurred_at, visitor_id, properties').eq('dedupe_key', key).abortSignal(signal).maybeSingle(),
    ]);
    if (!consent.data?.consent) return [];
    if (error || !row || (row.visitor_id && row.visitor_id !== visitor)) return [];
    if (row.visitor_id === visitor) return [{ id: row.id, name, occurred_at: row.occurred_at }];
    if (Date.parse(row.occurred_at) < startedAt - 1000) return [];
    let properties = {};
    try {
      const raw = req.headers.get('x-daymeet-measurement-properties');
      const parsed = raw && raw.length <= 2048 ? measurementPropertiesSchema.safeParse(JSON.parse(decodeURIComponent(raw))) : null;
      if (parsed?.success) properties = { ...parsed.data, ...(parsed.data.page_path && { page_path: normalizeMeasurementPath(parsed.data.page_path) }) };
    } catch {}
    const claimed = await db.from('measurement_events').update({ visitor_id: visitor, context, properties: { ...row.properties, ...properties } }).eq('id', row.id).is('visitor_id', null).select('id, occurred_at').abortSignal(signal).maybeSingle();
    return claimed.error || !claimed.data ? [] : [{ id: claimed.data.id, name, occurred_at: claimed.data.occurred_at }];
  } catch { return []; }
}

let activeFlush: Promise<void> | null = null;

export function flushConversions(): Promise<void> {
  if (activeFlush) return activeFlush;
  activeFlush = flushPendingConversions().finally(() => { activeFlush = null; });
  return activeFlush;
}

async function flushPendingConversions(): Promise<void> {
  if (!measurementEnabled() || !process.env.CHATGPT_ADS_API_KEY || !process.env.NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID) return;
  try {
    const db = createServerClient();
    const allowed = (process.env.NEXT_PUBLIC_CHATGPT_ADS_CONVERSION_EVENTS || 'event_created').split(',').filter((name) => conversionNames.some((supported) => supported === name));
    if (!allowed.length) return;
    const signal = AbortSignal.timeout(10000);
    const { data } = await db.from('measurement_events').select('id, name, occurred_at, context, visitor_id, ads_attempts').in('name', allowed).is('ads_sent_at', null).contains('context', { consent: true }).lte('ads_next_attempt_at', new Date().toISOString()).gte('occurred_at', new Date(Date.now() - 6 * 86400000).toISOString()).not('visitor_id', 'is', null).order('occurred_at').limit(10).abortSignal(signal);
    if (!data?.length) return;
    const visitors = await db.from('measurement_visitors').select('id').in('id', [...new Set(data.map((row) => row.visitor_id))]).eq('consent', true).abortSignal(signal);
    const consenting = new Set(visitors.data?.map((visitor) => visitor.id));
    const eligible = data.filter((row) => consenting.has(row.visitor_id));
    if (!eligible.length || signal.aborted) return;
    const sent = await sendChatGptConversions(eligible as StoredConversion[]);
    await Promise.all(eligible.map(async (row) => {
      const attempts = (row.ads_attempts as number) + 1;
      await db.from('measurement_events').update({
        ads_attempts: attempts,
        ads_next_attempt_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(attempts, 7))).toISOString(),
        ...(sent && process.env.CHATGPT_ADS_VALIDATE_ONLY !== 'true' && { ads_sent_at: new Date().toISOString() }),
      }).eq('id', row.id).abortSignal(signal);
    }));
  } catch { return; }
}
