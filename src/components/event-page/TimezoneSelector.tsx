'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const COMMON_TIMEZONES = [
  { value: 'UTC', city: 'UTC' },
  { value: 'America/New_York', city: 'New York' },
  { value: 'America/Chicago', city: 'Chicago' },
  { value: 'America/Denver', city: 'Denver' },
  { value: 'America/Los_Angeles', city: 'Los Angeles' },
  { value: 'Europe/London', city: 'London' },
  { value: 'Europe/Paris', city: 'Paris' },
  { value: 'Europe/Berlin', city: 'Berlin' },
  { value: 'Asia/Tokyo', city: 'Tokyo' },
  { value: 'Asia/Seoul', city: 'Seoul' },
  { value: 'Asia/Shanghai', city: 'Shanghai' },
  { value: 'Asia/Singapore', city: 'Singapore' },
  { value: 'Australia/Sydney', city: 'Sydney' },
] as const;

const STORAGE_KEY = 'whenmeets:timezone';

/** Get the UTC offset in minutes for a given IANA timezone */
function getTimezoneOffsetMinutes(tz: string): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart) return 0;

  // Parse "GMT+9" or "GMT-5:30" format
  const match = tzPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] || '0', 10);
  return sign * (hours * 60 + minutes);
}

/** Get a display label with dynamic offset (DST-aware) */
function formatTimezoneDisplay(tz: string): string {
  const offset = getTimezoneOffsetMinutes(tz);
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const h = Math.floor(absOffset / 60);
  const m = absOffset % 60;
  const label = m > 0 ? `GMT${sign}${h}:${String(m).padStart(2, '0')}` : `GMT${sign}${h}:00`;
  const entry = COMMON_TIMEZONES.find((t) => t.value === tz);
  const city = entry?.city ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  return `${label} ${city}`;
}

interface TimezoneSelectorProps {
  onChange?: (timezone: string, offsetSlots: number) => void;
}

export default function TimezoneSelector({ onChange }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState<string>('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from localStorage or auto-detect
    const stored = localStorage.getItem(STORAGE_KEY);
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tz = stored || detected;
    setTimezone(tz);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(newTz: string) {
    setTimezone(newTz);
    localStorage.setItem(STORAGE_KEY, newTz);

    if (onChange) {
      // Calculate the slot offset between old and new timezone
      const oldOffset = getTimezoneOffsetMinutes(timezone);
      const newOffset = getTimezoneOffsetMinutes(newTz);
      const diffMinutes = newOffset - oldOffset;
      // Each slot = 30 minutes
      const slotOffset = Math.round(diffMinutes / 30);
      onChange(newTz, slotOffset);
    }
  }

  if (!timezone) return null;

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer w-full"
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="flex-1 text-left truncate">{formatTimezoneDisplay(timezone)}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <button
                key={tz.value}
                onClick={() => { handleChange(tz.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer ${
                  timezone === tz.value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{formatTimezoneDisplay(tz.value)}</span>
                {timezone === tz.value && (
                  <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            {/* Include user's detected timezone if not in common list */}
            {!COMMON_TIMEZONES.some((t) => t.value === timezone) && (
              <button
                onClick={() => { handleChange(timezone); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm bg-indigo-50 text-indigo-700 font-medium flex items-center justify-between cursor-pointer"
              >
                <span>{formatTimezoneDisplay(timezone)}</span>
                <svg className="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
