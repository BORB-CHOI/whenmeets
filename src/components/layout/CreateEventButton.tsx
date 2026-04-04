'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import EventFormModal from '@/components/event-form/EventFormModal';

export default function CreateEventButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Hide on landing page — the landing page has its own CTA
  if (pathname === '/') return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-[38px] px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        이벤트 만들기
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <EventFormModal open={open} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
