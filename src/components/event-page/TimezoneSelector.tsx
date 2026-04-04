'use client';

import { useState, useEffect } from 'react';

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC+0:00', city: 'UTC' },
  { value: 'America/New_York', label: 'GMT-5:00', city: 'New York' },
  { value: 'America/Chicago', label: 'GMT-6:00', city: 'Chicago' },
  { value: 'America/Denver', label: 'GMT-7:00', city: 'Denver' },
  { value: 'America/Los_Angeles', label: 'GMT-8:00', city: 'Los Angeles' },
  { value: 'Europe/London', label: 'GMT+0:00', city: 'London' },
  { value: 'Europe/Paris', label: 'GMT+1:00', city: 'Paris' },
  { value: 'Europe/Berlin', label: 'GMT+1:00', city: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'GMT+9:00', city: 'Tokyo' },
  { value: 'Asia/Seoul', label: 'GMT+9:00', city: 'Seoul' },
  { value: 'Asia/Shanghai', label: 'GMT+8:00', city: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'GMT+8:00', city: 'Singapore' },
  { value: 'Australia/Sydney', label: 'GMT+11:00', city: 'Sydney' },
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

/** Get a display label for the current offset */
function formatTimezoneDisplay(tz: string): string {
  const entry = COMMON_TIMEZONES.find((t) => t.value === tz);
  if (entry) return `${entry.label} ${entry.city}`;

  // Fallback: compute from Intl
  const offset = getTimezoneOffsetMinutes(tz);
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const h = Math.floor(absOffset / 60);
  const m = absOffset % 60;
  const label = m > 0 ? `GMT${sign}${h}:${String(m).padStart(2, '0')}` : `GMT${sign}${h}:00`;
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  return `${label} ${city}`;
}

interface TimezoneSelectorProps {
  onChange?: (timezone: string, offsetSlots: number) => void;
}

export default function TimezoneSelector({ onChange }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState<string>('');

  useEffect(() => {
    // Load from localStorage or auto-detect
    const stored = localStorage.getItem(STORAGE_KEY);
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tz = stored || detected;
    setTimezone(tz);
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
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <svg
        className="h-3.5 w-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <select
        value={timezone}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-transparent text-xs text-gray-400 border-none outline-none cursor-pointer hover:text-gray-600 transition-colors p-0"
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label} {tz.city}
          </option>
        ))}
        {/* If the user's detected timezone isn't in the common list, include it */}
        {!COMMON_TIMEZONES.some((t) => t.value === timezone) && (
          <option value={timezone}>
            {formatTimezoneDisplay(timezone)}
          </option>
        )}
      </select>
    </div>
  );
}
