import type { Availability, EventMode } from '@/lib/types';

export type DayOfWeekKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface EventRow {
  id: string;
  title: string;
  dates: string[];
  time_start: number;
  time_end: number;
  created_at: string;
  password_hash: string | null;
  mode: EventMode;
  date_only: boolean;
  description: string | null;
  created_by: string | null;
  deleted_at: string | null;
  start_on_monday?: boolean;
}

export interface EventDetailParticipant {
  id: string;
  name: string;
  availability: Availability;
  created_at: string;
  avatar_url: string | null;
}

export interface EventDetail {
  id: string;
  title: string;
  dates?: string[];
  time_start?: number;
  time_end?: number;
  has_password: boolean;
  created_at?: string;
  mode?: EventMode;
  date_only?: boolean;
  description?: string;
  participants?: EventDetailParticipant[];
  is_owner?: boolean;
  requires_auth?: boolean;
}

export interface CreateEventInput {
  title: string;
  dates: string[];
  time_start?: number;
  time_end?: number;
  password?: string;
  mode?: EventMode;
  date_only?: boolean;
  start_on_monday?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  dates?: string[];
  time_start?: number;
  time_end?: number;
  mode?: EventMode;
  date_only?: boolean;
  description?: string;
}
