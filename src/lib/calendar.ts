import type { Availability, AvailabilityLevel } from './types';

/** Represents a Google Calendar event with start/end times */
export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface CalendarListResponse {
  items?: CalendarEvent[];
  error?: { code: number; message: string };
}

/**
 * Fetch events from Google Calendar API using the user's OAuth access token.
 * The access token comes from Supabase's provider_token (Google OAuth).
 */
export async function fetchCalendarEvents(
  accessToken: string,
  dateRange: string[],
): Promise<CalendarEvent[]> {
  if (dateRange.length === 0) return [];

  const sorted = [...dateRange].sort();
  const timeMin = `${sorted[0]}T00:00:00Z`;
  // End of the last date
  const timeMax = `${sorted[sorted.length - 1]}T23:59:59Z`;

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(
      error?.error?.message || `Google Calendar API 오류 (${res.status})`,
    );
  }

  const data: CalendarListResponse = await res.json();
  return data.items ?? [];
}

/**
 * Convert Google Calendar events to WhenMeets availability format.
 * Busy times (calendar events) become unavailable (0), free times become available (2).
 */
export function calendarEventsToAvailability(
  events: CalendarEvent[],
  dates: string[],
  timeStart: number,
  timeEnd: number,
): Availability {
  const availability: Availability = {};

  // Initialize all slots as available
  for (const date of dates) {
    availability[date] = {};
    for (let slot = timeStart; slot < timeEnd; slot++) {
      availability[date][String(slot)] = 2 as AvailabilityLevel;
    }
  }

  // Mark busy slots from calendar events
  for (const event of events) {
    // All-day events: mark all slots as unavailable for the full date range
    if (!event.start.dateTime || !event.end.dateTime) {
      const startDate = event.start.date;
      const endDate = event.end.date; // Google Calendar: end date is exclusive
      if (startDate) {
        for (const date of dates) {
          if (date >= startDate && (!endDate || date < endDate) && availability[date]) {
            for (let slot = timeStart; slot < timeEnd; slot++) {
              availability[date][String(slot)] = 0 as AvailabilityLevel;
            }
          }
        }
      }
      continue;
    }

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    for (const date of dates) {
      const dayStart = new Date(`${date}T00:00:00Z`);
      const dayEnd = new Date(`${date}T23:59:59Z`);

      // Check if this event overlaps with this date
      if (start > dayEnd || end < dayStart) continue;

      // Calculate which slots are busy
      const eventStartOnDay = start < dayStart ? dayStart : start;
      const eventEndOnDay = end > dayEnd ? dayEnd : end;

      // Use UTC hours/minutes since day boundaries are UTC-anchored
      const startSlot = Math.floor(
        (eventStartOnDay.getUTCHours() * 60 + eventStartOnDay.getUTCMinutes()) / 30,
      );
      const endSlot = Math.ceil(
        (eventEndOnDay.getUTCHours() * 60 + eventEndOnDay.getUTCMinutes()) / 30,
      );

      for (let slot = Math.max(startSlot, timeStart); slot < Math.min(endSlot, timeEnd); slot++) {
        if (availability[date]) {
          availability[date][String(slot)] = 0 as AvailabilityLevel;
        }
      }
    }
  }

  return availability;
}
