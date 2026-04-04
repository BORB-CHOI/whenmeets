'use client';

import { useState } from 'react';
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
  { key: 'created', label: '내가 만든 이벤트', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { key: 'participated', label: '참여한 이벤트', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )},
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function DashboardClient({
  createdEvents: initialCreated,
  participatedEvents,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('created');
  const [createdEvents, setCreatedEvents] = useState(initialCreated);

  const events = activeTab === 'created' ? createdEvents : participatedEvents;

  async function handleDelete(id: string) {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCreatedEvents((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-50 rounded-full border border-gray-200 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white text-indigo-600 font-semibold border border-indigo-600 shadow-sm'
                : 'text-gray-500 border border-transparent hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="mt-6">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">
              아직 이벤트가 없습니다.
            </p>
            <p className="text-gray-300 text-xs mt-1">
              상단의 이벤트 만들기 버튼으로 시작하세요
            </p>
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
                canDelete={activeTab === 'created'}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
