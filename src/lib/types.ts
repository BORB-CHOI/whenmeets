export type AvailabilityLevel = 0 | 1 | 2; // 0=unavailable, 1=if_needed, 2=available

// Keys are date strings "YYYY-MM-DD", values are objects mapping slot index to availability
// Slot index: 0=00:00, 1=00:30, 2=01:00, ..., 18=09:00, ..., 42=21:00
export type Availability = Record<string, Record<string, AvailabilityLevel>>;

export interface Event {
  id: string;
  title: string;
  dates: string[];       // ISO date strings
  time_start: number;    // Slot index (e.g., 18 = 09:00)
  time_end: number;      // Slot index, exclusive (e.g., 42 = 21:00)
  has_password: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  token: string;
  availability: Availability;
  created_at: string;
}

/** Event data with participants, as returned by the API */
export interface EventData extends Event {
  participants: Pick<Participant, 'id' | 'name' | 'availability' | 'created_at'>[];
  requires_auth?: boolean;
}
