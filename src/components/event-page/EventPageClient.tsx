'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Availability, EventData } from '@/lib/types';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAvailabilitySave } from '@/hooks/useAvailabilitySave';
import { generateSlots } from '@/lib/constants';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
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

const CalendarHeatmapGrid = dynamic(() => import('@/components/results/CalendarHeatmapGrid'), {
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
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`whenmeets:${eventId}`);
    if (stored) return JSON.parse(stored) as { participantId: string; token: string };
  } catch {
    try { localStorage.removeItem(`whenmeets:${eventId}`); } catch { /* SSR safe */ }
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
  const [googleUserName, setGoogleUserName] = useState<string | null>(null);
  const supabaseRef = useRef(createAuthBrowserClient());

  // Check if user is logged in via Google
  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setGoogleUserName(user.user_metadata.full_name);
      }
    });
  }, []);

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

  // Best times: timeful style — find max count, only show slots matching max
  const bestSlots = useMemo(() => {
    const filtered = event.participants.filter((p) => selectedIds.has(p.id));
    if (filtered.length === 0) return new Set<string>();

    const slots = generateSlots(event.time_start, event.time_end);
    let maxCount = 0;
    const slotCounts: { key: string; count: number }[] = [];

    for (const date of event.dates) {
      for (const slot of slots) {
        let count = 0;
        for (const p of filtered) {
          const val = p.availability?.[date]?.[String(slot)];
          if (val === 2) count++;
          else if (val === 1 && includeIfNeeded) count++;
        }
        if (count > 0) {
          slotCounts.push({ key: `${date}-${slot}`, count });
          if (count > maxCount) maxCount = count;
        }
      }
    }

    // Only slots with the maximum count are "best"
    return new Set(slotCounts.filter((s) => s.count === maxCount).map((s) => s.key));
  }, [event, selectedIds, includeIfNeeded]);

  // Hover: per-participant availability level at hovered slot (for sidebar styling)
  const slotAvailability = useMemo(() => {
    if (!hoveredSlot) return undefined;
    const map = new Map<string, 0 | 1 | 2>();
    for (const p of event.participants) {
      const val = p.availability?.[hoveredSlot.date]?.[String(hoveredSlot.slot)];
      map.set(p.id, (val as 0 | 1 | 2) ?? 0);
    }
    return map;
  }, [hoveredSlot, event.participants]);

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

  // Auto-join with Google name (no name modal needed)
  async function autoJoinWithName(name: string) {
    setNameLoading(true);
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
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return false;

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
      return true;
    } finally {
      setNameLoading(false);
    }
  }

  // Handle "Edit availability" click
  async function handleEditClick() {
    if (session) {
      setViewMode('edit');
    } else if (googleUserName) {
      // Google user: auto-join with their Google name
      const ok = await autoJoinWithName(googleUserName);
      if (ok) setViewMode('edit');
      else setShowNameModal(true); // fallback to manual
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

  // Date range display
  const sortedDates = [...event.dates].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const fmtShort = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const dateRange = firstDate === lastDate ? fmtShort(firstDate) : `${fmtShort(firstDate)} – ${fmtShort(lastDate)}`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Event header — timeful style */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dateRange}
            <span className="ml-3 text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium">이벤트 수정</span>
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
              className="h-[38px] px-5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-[0px_2px_8px_rgba(79,70,229,0.5)] transition-all cursor-pointer"
            >
              내 시간 입력
            </button>
          ) : (
            <button
              onClick={() => { setViewMode('view'); handleRealtimeUpdate(); }}
              className="h-[38px] px-5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-[0px_2px_8px_rgba(79,70,229,0.5)] transition-all cursor-pointer"
            >
              {saving ? '저장 중...' : '편집 완료'}
            </button>
          )}
        </div>
      </div>

      {/* Description add */}
      <p className="text-sm text-gray-400 hover:text-gray-500 cursor-pointer mb-6">+ 설명 추가</p>

      {/* Main content: 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Grid */}
        <div className="flex-1 min-w-0">
          {viewMode === 'edit' ? (
            <>
              {/* Guide banner — centered bold, sticky on mobile */}
              <div className={`mb-4 py-3 rounded-lg text-center text-sm font-bold sticky top-14 z-20 lg:static ${
                event.mode === 'unavailable'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                {event.mode === 'unavailable'
                  ? (event.date_only ? '⛔ 안 되는 날짜를 선택해주세요' : '⛔ 안 되는 시간을 선택해주세요')
                  : (event.date_only ? '✅ 되는 날짜를 선택해주세요' : '✅ 되는 시간을 선택해주세요')}
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
                eventMode={event.mode}
              />
            </>
          ) : event.date_only ? (
            <CalendarHeatmapGrid
              dates={event.dates}
              participants={event.participants}
              selectedIds={selectedIds}
              includeIfNeeded={includeIfNeeded}
              onCellHover={(date) => setHoveredSlot(date ? { date, slot: 0 } : null)}
              bestSlots={showBestTimes ? bestSlots : undefined}
            />
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
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-80 shrink-0 lg:pt-10 lg:pl-6 lg:border-l lg:border-gray-100">
          {viewMode === 'edit' ? (
            <>
              {/* Edit mode sidebar — legend + calendar + overlay */}
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">범례</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className="w-4 h-4 rounded-sm bg-[#4F46E5]/[.47] border border-gray-200/50" />
                    {event.mode === 'unavailable' ? 'Unavailable' : 'Available'}
                  </div>
                  {event.mode === 'available' && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="w-4 h-4 rounded-sm bg-[#FFE8B8] border border-gray-200/50" />
                      필요하다면..
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar import */}
              <div className="mb-5">
                <CalendarImportButton
                  dates={event.dates}
                  timeStart={event.time_start}
                  timeEnd={event.time_end}
                  onImport={handleAvailabilityChange}
                />
              </div>

              {/* Timezone */}
              <div className="mb-5">
                <TimezoneSelector />
              </div>

              {/* Delete availability */}
              <button
                onClick={() => {
                  if (confirm('내 응답을 삭제하시겠습니까?')) {
                    handleAvailabilityChange({});
                  }
                }}
                className="text-sm text-red-500 hover:text-red-600 cursor-pointer"
              >
                내 응답 삭제
              </button>
            </>
          ) : (
            <>
              {/* View mode sidebar — responses + options */}
              <h2 className="text-base font-bold text-gray-900 mb-3">
                응답자 {hoveredSlot && slotAvailability
                  ? `(${Array.from(slotAvailability.values()).filter((v) => v === 2 || (v === 1 && includeIfNeeded)).length}/${event.participants.length})`
                  : `(${event.participants.length})`}
              </h2>

              <ParticipantFilter
                participants={event.participants}
                selectedIds={selectedIds}
                onSelectedChange={setSelectedIds}
                slotAvailability={slotAvailability}
              />

              {/* Options */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">옵션</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowBestTimes(!showBestTimes)}
                    className="flex items-center justify-between text-sm text-gray-600 cursor-pointer"
                  >
                    <span>최적 시간만 보기</span>
                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${showBestTimes ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${showBestTimes ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                  {event.mode !== 'unavailable' && (
                    <button
                      onClick={() => setIncludeIfNeeded(!includeIfNeeded)}
                      className="flex items-center justify-between text-sm text-gray-600 cursor-pointer"
                    >
                      <span>"필요하다면.." 숨기기</span>
                      <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${!includeIfNeeded ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${!includeIfNeeded ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

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
