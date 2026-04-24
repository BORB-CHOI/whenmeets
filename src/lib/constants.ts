export const AVAILABILITY = {
  UNAVAILABLE: 0,
  IF_NEEDED: 1,
  AVAILABLE: 2,
} as const;

export const AVAILABILITY_COLORS = {
  0: 'bg-gray-100',       // Unavailable / empty
  1: 'bg-amber-300',      // If needed
  2: 'bg-emerald-600/[.47]',  // Available
} as const;

export const MODE_LABELS = {
  2: '가능',
  1: '되면 가능',
  0: '불가능',
} as const;

/** Cell height in pixels for time-slot grids (heatmap + edit) */
export const CELL_HEIGHT = 15;

/** Slots per hour (4 = 15-minute intervals) */
export const SLOTS_PER_HOUR = 4;

/** Convert slot index to "HH:MM" string (15-min intervals: slot 0=00:00, 4=01:00, 36=09:00) */
export function slotToTime(slot: number): string {
  const hours = Math.floor(slot / SLOTS_PER_HOUR);
  const minutes = (slot % SLOTS_PER_HOUR) * 15;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/** Generate array of slot indices between start (inclusive) and end (exclusive) */
export function generateSlots(start: number, end: number): number[] {
  const slots: number[] = [];
  for (let i = start; i < end; i++) {
    slots.push(i);
  }
  return slots;
}

/** Day-of-week key set for events created with the day-of-week picker */
export const DAY_OF_WEEK_KEYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/** Korean day labels keyed by mon/tue/... */
export const DAY_OF_WEEK_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};

/** Returns true when the entry is a day-of-week key (e.g. "mon") rather than YYYY-MM-DD. */
export function isDayOfWeekKey(s: string): boolean {
  return DAY_OF_WEEK_KEYS.has(s);
}

/** Format date entry to compact display.
 * - Calendar dates ("YYYY-MM-DD") → "M/D 요일"
 * - Day-of-week keys ("mon"…"sun") → "월", "화"… (single character)
 */
export function formatDateCompact(dateStr: string): string {
  if (isDayOfWeekKey(dateStr)) return DAY_OF_WEEK_LABELS[dateStr];
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`;
}
