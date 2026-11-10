'use client';

import { browserMeasurementNames, browserMeasurementSchema, measurementContextSchema, measurementPropertiesSchema, normalizeMeasurementPath, sanitizeAcquisition, type ConversionReceipt, type MeasurementContext, type MeasurementProperties } from './measurement';
import { createPixelQueue } from './measurement-pixel-queue';
import { MEASUREMENT_STORAGE_KEYS } from './constants';

type QueueFunction = ((...args: unknown[]) => void) & { q?: unknown[][] };
type MeasurementWindow = Window & { gtag?: QueueFunction; dataLayer?: unknown[]; clarity?: QueueFunction; oaiq?: QueueFunction; navigator: Navigator & { globalPrivacyControl?: boolean } };
const keys = MEASUREMENT_STORAGE_KEYS;
let consentWrite: Promise<boolean> | null = null;
let consentRevision = 0;
let measurementReady = false;
const pendingConversions: { receipts: ConversionReceipt[]; properties: MeasurementProperties }[] = [];

function safelyMeasure(task: () => void) {
  try { task(); } catch { return; }
}

export function isMeasurementEnabled(): boolean {
  if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_MEASUREMENT_ENABLED !== 'true') return false;
  if (process.env.NEXT_PUBLIC_MEASUREMENT_DEBUG === 'true') return true;
  try { return process.env.NODE_ENV === 'production' && window.location.origin === new URL(process.env.NEXT_PUBLIC_SITE_URL || '').origin; } catch { return false; }
}

export function getMeasurementConsent(): 'granted' | 'denied' | null {
  if (typeof window === 'undefined') return null;
  if ((window as MeasurementWindow).navigator.globalPrivacyControl) return 'denied';
  try {
    const value = localStorage.getItem(keys.consent);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch { return 'denied'; }
}

function storedContext(): MeasurementContext | null {
  if (!isMeasurementEnabled() || getMeasurementConsent() !== 'granted') return null;
  try {
    let session = sessionStorage.getItem(keys.session);
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(keys.session, session); }
    const previous = JSON.parse(localStorage.getItem(keys.acquisition) || 'null');
    const current = sanitizeAcquisition(window.location.href, document.referrer);
    const click = new URL(window.location.href).searchParams.get('oppref');
    const active = previous && Date.now() - previous.timestamp < 30 * 86400000 ? previous.context : {};
    const next = { ...active, ...current, ...(click && click.length <= 1024 && { oppref: click }) };
    localStorage.setItem(keys.acquisition, JSON.stringify({ timestamp: click || Object.keys(current).length ? Date.now() : previous?.timestamp ?? Date.now(), context: next }));
    const cookie = (name: string) => document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    const context = measurementContextSchema.safeParse({ consent: true, session_id: session, ...next, ...(cookie('__obref') && { obref: decodeURIComponent(cookie('__obref')!) }) });
    return context.success ? context.data : null;
  } catch { return null; }
}

export function getMeasurementHeaders(): Record<string, string> {
  const context = storedContext();
  return context ? { 'x-daymeet-measurement': encodeURIComponent(JSON.stringify(context)) } : {};
}

function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id; script.async = true; script.src = src; document.head.appendChild(script);
}

export function initializeMeasurement() {
  if (!storedContext()) return;
  const target = window as MeasurementWindow;
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (ga) (target as unknown as Record<string, unknown>)[`ga-disable-${ga}`] = false;
  if (ga && /^G-[A-Z0-9]+$/.test(ga) && !target.gtag) {
    target.dataLayer = target.dataLayer || [];
    const initializer = document.createElement('script');
    initializer.textContent = 'window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};';
    document.head.appendChild(initializer);
    const gtag = (window as MeasurementWindow).gtag;
    gtag?.('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag?.('js', new Date());
    gtag?.('config', ga, { send_page_view: false, page_location: window.location.origin + normalizeMeasurementPath(window.location.pathname), page_title: 'DayMeet', page_referrer: document.referrer ? new URL(document.referrer).origin : '' });
    loadScript('daymeet-ga', `https://www.googletagmanager.com/gtag/js?id=${ga}`);
  }
  const pixel = process.env.NEXT_PUBLIC_CHATGPT_ADS_PIXEL_ID;
  if (pixel && /^[a-zA-Z0-9_-]{1,128}$/.test(pixel) && !target.oaiq) {
    const frame = document.createElement('iframe');
    frame.id = 'daymeet-chatgpt-ads'; frame.hidden = true; frame.title = '광고 전환 측정'; frame.referrerPolicy = 'no-referrer';
    const context = storedContext();
    frame.src = `/measurement${context?.oppref ? `?oppref=${encodeURIComponent(context.oppref)}` : ''}`;
    const bridge = createPixelQueue((args) => frame.contentWindow?.postMessage({ type: 'daymeet-pixel-command', args }, window.location.origin), () => getMeasurementConsent() === 'granted');
    const queue: QueueFunction = (...args) => bridge.send(args);
    target.oaiq = queue;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.contentWindow || event.data?.type !== 'daymeet-pixel-ready') return;
      bridge.ready();
    };
    window.addEventListener('message', receive);
    document.body.appendChild(frame);
    target.oaiq('consent', true);
  }
  safelyMeasure(() => target.gtag?.('consent', 'update', { analytics_storage: 'granted' }));
  safelyMeasure(() => target.oaiq?.('consent', true));
  measurementReady = true;
  for (const pending of pendingConversions.splice(0)) trackConversions(pending.receipts, pending.properties);
}

export async function setMeasurementConsent(granted: boolean): Promise<boolean> {
  if (!isMeasurementEnabled()) return false;
  const allowed = granted && !(window as MeasurementWindow).navigator.globalPrivacyControl;
  const revision = ++consentRevision;
  let denialVersion: string | null;
  try {
    denialVersion = localStorage.getItem(keys.denial);
    if (!allowed) { localStorage.setItem(keys.consent, 'denied'); localStorage.setItem(keys.denial, crypto.randomUUID()); }
  } catch { return false; }
  if (!allowed) {
    measurementReady = false;
    pendingConversions.length = 0;
    const target = window as MeasurementWindow;
    const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (ga) (target as unknown as Record<string, unknown>)[`ga-disable-${ga}`] = true;
    safelyMeasure(() => target.oaiq?.('consent', false));
    safelyMeasure(() => target.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }));
    try { localStorage.removeItem(keys.acquisition); localStorage.removeItem(keys.sent); sessionStorage.removeItem(keys.session); } catch {}
  }
  const previous = consentWrite;
  const write = (async () => {
    if (previous) await previous;
    try {
      const response = await fetch('/api/measurement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: allowed }), keepalive: true });
      if (!response.ok) return false;
      if (allowed && localStorage.getItem(keys.denial) !== denialVersion) {
        await fetch('/api/measurement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: false }), keepalive: true });
        return false;
      }
      if (allowed && consentRevision === revision) {
        localStorage.setItem(keys.consent, 'granted');
        initializeMeasurement();
      }
      window.dispatchEvent(new Event('daymeet-measurement-consent'));
      return true;
    } catch { return false; }
  })();
  consentWrite = write;
  void write.finally(() => { if (consentWrite === write) consentWrite = null; });
  return write;
}

export function trackEvent(name: typeof browserMeasurementNames[number], properties: MeasurementProperties = {}, scheduleId?: string) {
  if (!measurementReady) return false;
  const context = storedContext();
  if (!context) return false;
  const parsed = browserMeasurementSchema.safeParse({ name, properties, ...(scheduleId && { schedule_id: scheduleId }) });
  if (!parsed.success) return false;
  const target = window as MeasurementWindow;
  const safeProperties = { ...parsed.data.properties, ...(properties.page_path && { page_path: normalizeMeasurementPath(properties.page_path) }) };
  safelyMeasure(() => target.gtag?.('event', name === 'page_viewed' ? 'page_view' : name, { ...safeProperties, page_location: window.location.origin + normalizeMeasurementPath(window.location.pathname), page_title: 'DayMeet' }));
  safelyMeasure(() => target.clarity?.('event', name));
  if (name === 'page_viewed') safelyMeasure(() => target.oaiq?.('measure', 'page_viewed', { type: 'contents', contents: [{ id: normalizeMeasurementPath(window.location.pathname), content_type: 'page' }] }, { opt_out: true }));
  safelyMeasure(() => { void fetch('/api/measurement', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getMeasurementHeaders() }, body: JSON.stringify({ ...parsed.data, properties: safeProperties }), keepalive: true }).catch(() => undefined); });
  return true;
}

export function trackConversions(receipts: ConversionReceipt[] = [], properties: MeasurementProperties = {}) {
  if (!storedContext()) return;
  const safe = measurementPropertiesSchema.safeParse(properties);
  if (!safe.success) return;
  if (!measurementReady) { pendingConversions.push({ receipts, properties: safe.data }); return; }
  try {
    const sent = JSON.parse(localStorage.getItem(keys.sent) || '[]') as string[];
    const allowed = (process.env.NEXT_PUBLIC_CHATGPT_ADS_CONVERSION_EVENTS || 'event_created').split(',');
    for (const receipt of receipts) {
      if (sent.includes(receipt.id)) continue;
      const target = window as MeasurementWindow;
      target.gtag?.('event', receipt.name, { ...safe.data, page_location: window.location.origin + normalizeMeasurementPath(window.location.pathname), page_title: 'DayMeet' });
      target.clarity?.('event', receipt.name);
      if (allowed.includes(receipt.name)) target.oaiq?.('measure', 'custom', { type: 'custom' }, { custom_event_name: receipt.name, event_id: receipt.id, opt_out: true });
      sent.push(receipt.id);
    }
    localStorage.setItem(keys.sent, JSON.stringify(sent.slice(-200)));
  } catch { return; }
}
