import { z } from 'zod';
import { MEASUREMENT_BROWSER_EVENTS, MEASUREMENT_CONVERSION_EVENTS } from './constants';

export const browserMeasurementNames = MEASUREMENT_BROWSER_EVENTS;
export const conversionNames = MEASUREMENT_CONVERSION_EVENTS;
export type ConversionName = typeof conversionNames[number];

export const measurementPropertiesSchema = z.object({
  entry_point: z.enum(['home', 'header', 'new_page', 'event_page', 'other']).optional(),
  event_mode: z.enum(['available', 'unavailable']).optional(),
  date_only: z.boolean().optional(),
  date_selection_mode: z.enum(['calendar', 'days_of_week']).optional(),
  title_edited: z.boolean().optional(),
  browser_context: z.enum(['in_app', 'browser']).optional(),
  failure_stage: z.enum(['identity', 'save', 'network', 'clipboard']).optional(),
  page_path: z.string().max(120).optional(),
}).strict();
export type MeasurementProperties = z.infer<typeof measurementPropertiesSchema>;

const acquisitionValue = z.string().regex(/^[a-zA-Z0-9_.-]{1,100}$/);
export const measurementContextSchema = z.object({
  consent: z.literal(true),
  session_id: z.uuid().optional(),
  source: acquisitionValue.optional(),
  medium: acquisitionValue.optional(),
  campaign: acquisitionValue.optional(),
  referrer_host: z.string().regex(/^[a-zA-Z0-9.-]{1,253}$/).optional(),
  oppref: z.string().min(1).max(1024).refine((value) => value.trim().length > 0).optional(),
  obref: z.string().min(1).max(128).refine((value) => value.trim().length > 0).optional(),
}).strict();
export type MeasurementContext = z.infer<typeof measurementContextSchema>;
export const browserMeasurementSchema = z.object({
  name: z.enum(browserMeasurementNames),
  schedule_id: z.string().min(1).max(100).optional(),
  properties: measurementPropertiesSchema.default({}),
  context: measurementContextSchema.optional(),
}).strict();

export interface ConversionReceipt { id: string; name: ConversionName; occurred_at: string }
export interface StoredConversion { id: string; name: string; occurred_at: string; context: Record<string, unknown> }

export function normalizeMeasurementPath(value: string): string {
  return value.split(/[?#]/)[0].replace(/^\/e\/[^/]+/, '/e/event').slice(0, 120);
}

export function sanitizeAcquisition(location: string, referrer: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const url = new URL(location);
    for (const [parameter, key] of [['utm_source', 'source'], ['utm_medium', 'medium'], ['utm_campaign', 'campaign']]) {
      const value = url.searchParams.get(parameter);
      if (value && acquisitionValue.safeParse(value).success) result[key] = value;
    }
    if (referrer) {
      const external = new URL(referrer);
      if (['https:', 'http:'].includes(external.protocol) && external.hostname !== url.hostname) result.referrer_host = external.hostname;
    }
  } catch { return result; }
  return result;
}
