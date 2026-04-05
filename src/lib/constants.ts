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

/** Format date string "YYYY-MM-DD" to compact display like "Mon 4/7" */
export function formatDateCompact(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()} ${days[date.getDay()]}`;
}
