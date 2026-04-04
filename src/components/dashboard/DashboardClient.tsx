'use client';

import { useState } from 'react';
import Link from 'next/link';
import EventCard from './EventCard';

interface EventItem {
  id: string;
  title: string;
  dates: string[];
  created_at: string;
  participant_count: number;
}

interface DashboardClientProps {
  createdEvents: EventItem[];
  participatedEvents: EventItem[];
}

const tabs = [
  { key: 'created', label: '내가 만든 일정' },
  { key: 'participated', label: '참여한 일정' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function DashboardClient({
  createdEvents,
  participatedEvents,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('created');

  const events = activeTab === 'created' ? createdEvents : participatedEvents;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-50 rounded-full border border-gray-200 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-indigo-600 font-semibold border border-indigo-600 shadow-sm'
                : 'text-gray-500 border border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="mt-6">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">
              아직 일정이 없습니다. 새 일정을 만들어보세요!
            </p>
            <Link
              href="/new"
              className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] hover:-translate-y-px active:translate-y-0 transition-all"
            >
              새 일정 만들기
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                dateCount={event.dates.length}
                participantCount={event.participant_count}
                createdAt={event.created_at}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
