import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { browserMeasurementSchema, normalizeMeasurementPath } from '@/lib/measurement';
import { createServerClient } from '@/lib/supabase/server';
import { flushConversions, measurementEnabled, readMeasurementContext, readMeasurementVisitor } from '@/server/measurement/service';
import { rateLimit } from '@/lib/rate-limit';
import { MEASUREMENT_COOKIES } from '@/lib/constants';

export const maxDuration = 60;

const consentSchema = z.object({ consent: z.boolean() }).strict();

export async function POST(req: NextRequest) {
  if (!measurementEnabled()) return new NextResponse(null, { status: 204 });
  const origin = req.headers.get('origin');
  if (!origin || origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const limit = rateLimit({ key: `measurement:${req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'}`, limit: 120, windowMs: 60000 });
  if (!limit.allowed) return new NextResponse(null, { status: 429 });
  const text = await req.text();
  if (text.length > 8192) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return new NextResponse(null, { status: 400 }); }
  const consent = consentSchema.safeParse(body);
  const visitorId = readMeasurementVisitor(req) ?? randomUUID();
  const db = createServerClient();
  if (consent.success) {
    const { error } = await db.from('measurement_visitors').upsert({ id: visitorId, consent: consent.data.consent, updated_at: new Date().toISOString() });
    if (error) return new NextResponse(null, { status: 503 });
    if (!consent.data.consent) {
      await db.from('measurement_events').update({ context: {}, visitor_id: null }).eq('visitor_id', visitorId);
    }
    const response = new NextResponse(null, { status: 204 });
    const cookie = { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 180 };
    response.cookies.set(MEASUREMENT_COOKIES.visitor, visitorId, cookie);
    response.cookies.set(MEASUREMENT_COOKIES.consent, consent.data.consent ? 'granted' : 'denied', cookie);
    return response;
  }
  const event = browserMeasurementSchema.safeParse(body);
  const context = readMeasurementContext(req);
  if (!event.success) return new NextResponse(null, { status: 400 });
  if (!context || !readMeasurementVisitor(req)) return new NextResponse(null, { status: 204 });
  const visitor = await db.from('measurement_visitors').select('consent').eq('id', visitorId).maybeSingle();
  if (!visitor.data?.consent) return new NextResponse(null, { status: 204 });
  const properties = { ...event.data.properties };
  if (properties.page_path) properties.page_path = normalizeMeasurementPath(properties.page_path);
  const { error } = await db.from('measurement_events').insert({ name: event.data.name, schedule_id: event.data.schedule_id ?? null, visitor_id: visitorId, context, properties });
  if (error) return new NextResponse(null, { status: 503 });
  after(flushConversions);
  return new NextResponse(null, { status: 204 });
}
