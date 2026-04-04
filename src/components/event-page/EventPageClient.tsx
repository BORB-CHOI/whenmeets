'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Availability, EventData, Participant } from '@/lib/types';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAvailabilitySave } from '@/hooks/useAvailabilitySave';
import { generateSlots, slotToTime, formatDateCompact } from '@/lib/constants';
import PasswordForm from './PasswordForm';
import ParticipantFilter from '@/components/results/ParticipantFilter';
import DragGrid from '@/components/drag-grid/DragGrid';
import CalendarImportButton from './CalendarImportButton';
import TimezoneSelector from './TimezoneSelector';

const HeatmapGrid = dynamic(() => import('@/components/results/HeatmapGrid'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-xs text-gray-300">로딩 중...</span>
    </div>
  ),
});

type InitialState =
  | { type: 'password' }
  | { type: 'ready' };

interface EventPageClientProps {
  eventId: string;
  initialEvent: EventData;
  initialState: InitialState;
}

// view = heatmap results (default), edit = drag grid
type ViewMode = 'view' | 'edit';

function readStoredSession(eventId: string) {
  try {
    const stored = localStorage.getItem(`whenmeets:${eventId}`);
    if (stored) return JSON.parse(stored) as { participantId: string; token: string };
  } catch {
    localStorage.removeItem(`whenmeets:${eventId}`);
  }
  return null;
}

export default function EventPageClient({
  eventId,
  initialEvent,
  initialState,
}: EventPageClientProps) {
  const [event, setEvent] = useState<EventData>(initialEvent);
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{ date: string; slot: number } | null>(null);

  // Heatmap filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialEvent.participants.map((p) => p.id)),
  );
  const [includeIfNeeded, setIncludeIfNeeded] = useState(true);
  const [showBestTimes, setShowBestTimes] = useState(false);

  // Session (localStorage)
  const [session, setSession] = useState(() => {
    if (initialState.type === 'password') return null;
    const s = readStoredSession(eventId);
    if (s && initialEvent.participants.find((p) => p.id === s.participantId)) return s;
    return null;
  });

  const [participantId, setParticipantId] = useState<string | null>(session?.participantId ?? null);
  const [participantToken, setParticipantToken] = useState<string | null>(session?.token ?? null);
  const [availability, setAvailability] = useState<Availability>(() => {
    if (!session) return {};
    const existing = initialEvent.participants.find((p) => p.id === session.participantId);
    return existing?.availability ?? {};
  });

  const { saving, saveAvailability } = useAvailabilitySave({
    eventId,
    participantId,
    participantToken,
  });

  // Realtime sync
  const handleRealtimeUpdate = useCallback(() => {
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data: EventData) => {
        if (!data.requires_auth) {
          setEvent(data);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            data.participants.forEach((p) => next.add(p.id));
            return next;
          });
        }
      });
  }, [eventId]);

  useRealtimeSync(eventId, true, handleRealtimeUpdate);

  // Best times calculation
  const bestSlots = useMemo(() => {
    const filtered = event.participants.filter((p) => selectedIds.has(p.id));
    if (filtered.length === 0) return new Set<string>();

    const slots = generateSlots(event.time_start, event.time_end);
    const counts: { key: string; count: number }[] = [];

    for (const date of event.dates) {
      for (const slot of slots) {
        let count = 0;
        for (const p of filtered) {
          const val = p.availability?.[date]?.[String(slot)];
          if (val === 2) count++;
          else if (val === 1 && includeIfNeeded) count++;
        }
        if (count >= 2) {
          counts.push({ key: `${date}-${slot}`, count });
        }
      }
    }

    counts.sort((a, b) => b.count - a.count);
    return new Set(counts.slice(0, 10).map((c) => c.key));
  }, [event, selectedIds, includeIfNeeded]);

  // Hover: which participants are available at hovered slot
  const hoveredAvailable = useMemo(() => {
    if (!hoveredSlot) return new Set<string>();
    const ids = new Set<string>();
    for (const p of event.participants) {
      const val = p.availability?.[hoveredSlot.date]?.[String(hoveredSlot.slot)];
      if (val === 2 || (val === 1 && includeIfNeeded)) ids.add(p.id);
    }
    return ids;
  }, [hoveredSlot, event.participants, includeIfNeeded]);

  // Password state
  if (initialState.type === 'password' && !session) {
    return (
      <PasswordForm
        event={event}
        eventId={eventId}
        onAuthenticated={(data) => {
          setEvent(data);
          const stored = readStoredSession(eventId);
          if (stored) {
            const existing = data.participants.find((p) => p.id === stored.participantId);
            if (existing) {
              setSession(stored);
              setParticipantId(stored.participantId);
              setParticipantToken(stored.token);
              setAvailability(existing.availability);
            }
          }
        }}
      />
    );
  }

  // Handle "Edit availability" click
  function handleEditClick() {
    if (session) {
      setViewMode('edit');
    } else {
      setShowNameModal(true);
    }
  }

  // Handle name submit (modal)
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setNameLoading(true);
    setNameError('');
    try {
      let storedToken: string | null = null;
      try {
        const stored = localStorage.getItem(`whenmeets:${eventId}`);
        if (stored) storedToken = JSON.parse(stored).token;
      } catch { /* */ }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedToken) headers['X-Participant-Token'] = storedToken;

      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: nameInput.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setNameError(errData.error || '참여에 실패했습니다');
        return;
      }

      const data = await res.json();
      setParticipantId(data.id);
      setParticipantToken(data.token);
      setSession({ participantId: data.id, token: data.token });
      localStorage.setItem(
        `whenmeets:${eventId}`,
        JSON.stringify({ participantId: data.id, token: data.token }),
      );

      if (data.existing) {
        const existingP = event.participants.find((p) => p.id === data.id);
        if (existingP) setAvailability(existingP.availability);
      }

      setShowNameModal(false);
      setNameInput('');
      setViewMode('edit');
    } finally {
      setNameLoading(false);
    }
  }

  function handleAvailabilityChange(newAvailability: Availability) {
    setAvailability(newAvailability);
    saveAvailability(newAvailability);
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/e/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {event.dates.length}일 · {event.participants.length}명 참여
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="h-[38px] px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {copied ? '복사됨!' : '링크 복사'}
            {!copied && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            )}
          </button>
          {viewMode === 'view' ? (
            <button
              onClick={handleEditClick}
              className="h-[38px] px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:shadow-[0px_4px_12px_rgba(79,70,229,0.4)] transition-all cursor-pointer flex items-center"
            >
              내 시간 입력
            </button>
          ) : (
            <button
              onClick={() => {
                setViewMode('view');
                handleRealtimeUpdate();
              }}
              className="h-[38px] px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-[0px_2px_8px_rgba(79,70,229,0.5)] transition-all cursor-pointer flex items-center"
            >
              {saving ? '저장 중...' : '편집 완료'}
            </button>
          )}
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Grid */}
        <div className="flex-1 min-w-0">
          {viewMode === 'edit' ? (
            <>
              <div className="mb-3">
                <CalendarImportButton
                  dates={event.dates}
                  timeStart={event.time_start}
                  timeEnd={event.time_end}
                  onImport={handleAvailabilityChange}
                />
              </div>
              <DragGrid
                dates={event.dates}
                timeStart={event.time_start}
                timeEnd={event.time_end}
                availability={availability}
                onAvailabilityChange={handleAvailabilityChange}
                participants={event.participants}
                currentParticipantId={participantId}
                dateOnly={event.date_only}
              />
              <div className="mt-3">
                <TimezoneSelector />
              </div>
            </>
          ) : (
            <>
              {event.participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p>아직 응답이 없습니다.</p>
                  <button
                    onClick={handleEditClick}
                    className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium cursor-pointer"
                  >
                    첫 번째로 시간 입력하기
                  </button>
                </div>
              ) : (
                <HeatmapGrid
                  dates={event.dates}
                  timeStart={event.time_start}
                  timeEnd={event.time_end}
                  participants={event.participants}
                  selectedIds={selectedIds}
                  includeIfNeeded={includeIfNeeded}
                  hoveredParticipantId={null}
                  onCellHover={(date, slot) => setHoveredSlot(date ? { date, slot: slot! } : null)}
                  bestSlots={showBestTimes ? bestSlots : undefined}
                />
              )}
            </>
          )}
        </div>

        {/* Right: Sidebar (always visible) */}
        <div className="w-full lg:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            응답 ({event.participants.length}명)
          </h2>

          <ParticipantFilter
            participants={event.participants}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            onHover={(id) => {}}
            onHoverEnd={() => {}}
            highlightedIds={hoveredSlot ? hoveredAvailable : undefined}
          />

          <button
            onClick={handleEditClick}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
          >
            + 내 시간 추가
          </button>

          {/* Options */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-3">
            <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showBestTimes}
                onChange={(e) => setShowBestTimes(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Show best times
            </label>
            <label className="flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!includeIfNeeded}
                onChange={(e) => setIncludeIfNeeded(!e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Hide if needed times
            </label>
          </div>

          {/* Share link */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">이 일정을 공유하세요:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/e/${eventId}` : ''}
                className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                복사
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Name input modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowNameModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-1">내 시간 입력하기</h2>
              <p className="text-sm text-gray-500 mb-4">이름을 입력하고 참여하세요</p>

              <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="이름 입력"
                  disabled={nameLoading}
                  className="px-4 py-3 border border-gray-200 rounded-md transition-all focus:outline-none focus:border-indigo-600 focus:ring focus:ring-indigo-600/10 focus:scale-[1.005] disabled:opacity-50"
                  maxLength={50}
                  autoFocus
                />
                {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                <button
                  type="submit"
                  disabled={nameLoading || !nameInput.trim()}
                  className="h-[38px] bg-indigo-600 text-white font-semibold rounded-md shadow-[0px_2px_8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {nameLoading ? '참여 중...' : '참여하기'}
                </button>
              </form>

              <button
                onClick={() => setShowNameModal(false)}
                className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                취소
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast for copy */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg"
          >
            링크가 복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
