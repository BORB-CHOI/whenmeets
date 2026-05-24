'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EventData } from '@/lib/types';
import { eventsApi, resultsApi } from '@/lib/api-client';

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
      const detail = await eventsApi.getDetail(eventId);
      return detail as unknown as EventData;
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
      const data = await resultsApi.getResults(eventId);
      return data as unknown as ResultsData;
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
