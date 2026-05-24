/**
 * Availability domain — heatmap aggregation, slot/time helpers, and
 * Availability-related types. Re-exports from existing modules to keep
 * the import surface stable while clarifying domain boundaries.
 */

export {
  generateSlots,
  slotToTime,
  CELL_HEIGHT,
  SLOTS_PER_HOUR,
} from '@/lib/constants';

export type { AvailabilityLevel, Availability, EventMode } from '@/lib/types';

export * from '@/lib/heatmap';
