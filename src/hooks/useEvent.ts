'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EventData } from '@/lib/types';

export const eventQueryKey = (eventId: string) => ['event', eventId] as const;
export const resultsQueryKey = (eventId: string) => ['results', eventId] as const;

interface UseEventOptions {
  /** Server-rendered initial data — keeps SSR data through hydration without re-fetch. */
  initialData?: EventData;
  /** Skip fetching entirely (e.g. password gate not yet passed). */
  enabled?: boolean;
}

export function useEvent(eventId: string, opts: UseEventOptions = {}) {
  return useQuery({
    queryKey: eventQueryKey(eventId),
    queryFn: async (): Promise<EventData> => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error(`Failed to load event: ${res.status}`);
      return res.json();
    },
    initialData: opts.initialData,
    enabled: opts.enabled !== false,
  });
}

interface ResultsData {
  event: {
    id: string;
    title: string;
    dates: string[];
    time_start: number;
    time_end: number;
    mode?: 'available' | 'unavailable';
  };
  participants: {
    id: string;
    name: string;
    availability?: Record<string, Record<string, 0 | 1 | 2>>;
    avatar_url?: string | null;
  }[];
}

export function useResults(eventId: string, initialData?: ResultsData) {
  return useQuery({
    queryKey: resultsQueryKey(eventId),
    queryFn: async (): Promise<ResultsData> => {
      const res = await fetch(`/api/events/${eventId}/results`);
      if (!res.ok) throw new Error(`Failed to load results: ${res.status}`);
      return res.json();
    },
    initialData,
  });
}

export function useInvalidateEvent() {
  const qc = useQueryClient();
  return (eventId: string) => {
    qc.invalidateQueries({ queryKey: eventQueryKey(eventId) });
    qc.invalidateQueries({ queryKey: resultsQueryKey(eventId) });
  };
}
