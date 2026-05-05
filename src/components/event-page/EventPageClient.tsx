'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Availability, AvailabilityLevel, EventData } from '@/lib/types';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAvailabilitySave } from '@/hooks/useAvailabilitySave';
import { generateSlots, slotToTime, isDayOfWeekKey, DAY_OF_WEEK_LABELS, formatDateCompact } from '@/lib/constants';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import { getActiveSession, upsertSession } from '@/lib/session-store';
import PasswordForm from './PasswordForm';
import { addEventToHistory } from '@/lib/event-history';
import EventFormModal from '@/components/event-form/EventFormModal';
import ParticipantFilter, { type ParticipantFilterHandle } from '@/components/results/ParticipantFilter';
import HeatmapLegend from '@/components/results/HeatmapLegend';
import DragGrid from '@/components/drag-grid/DragGrid';
import CalendarImportButton from './CalendarImportButton';
import ConfirmModal from '@/components/ui/ConfirmModal';
import HoverInfoPopover, { type HoverInfoPosition } from '@/components/ui/HoverInfoPopover';
import MobileBottomBar from './MobileBottomBar';

const HeatmapGrid = dynamic(() => import('@/components/results/HeatmapGrid'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-xs text-gray-300 dark:text-gray-500">로딩 중...</span>
    </div>
  ),
});

const CalendarHeatmapGrid = dynamic(() => import('@/components/results/CalendarHeatmapGrid'), {
  loading: () => (
    <div className="w-full h-64 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-xs text-gray-300 dark:text-gray-500">로딩 중...</span>
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
  const active = getActiveSession(eventId);
  if (!active) return null;
  return { participantId: active.pid, name: active.name, password: active.password };
}

export default function EventPageClient({
  eventId,
  initialEvent,
  initialState,
}: EventPageClientProps) {
  const [event, setEvent] = useState<EventData>(initialEvent);
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameExistingMatch, setNameExistingMatch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{ date: string; slot: number } | null>(null);
  const [mobileSlotSheet, setMobileSlotSheet] = useState<{ date: string; slot: number } | null>(null);
  const [hoverRect, setHoverRect] = useState<HoverInfoPosition | null>(null);
  const [description, setDescription] = useState(initialEvent.description ?? '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [googleUserName, setGoogleUserName] = useState<string | null>(null);
  const [supabase] = useState(() => createAuthBrowserClient());
  const participantFilterRef = useRef<ParticipantFilterHandle | null>(null);

  // Check if user is logged in via Google
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.user_metadata?.full_name) {
        setGoogleUserName(session.user.user_metadata.full_name);
      }
    });
  }, [supabase]);

  // Debounce name matching for existing participant check
  useEffect(() => {
    if (!nameInput.trim()) {
      setNameExistingMatch(false);
      return;
    }
    const timer = setTimeout(() => {
      const match = event.participants.some(
        (p) => p.name.toLowerCase() === nameInput.trim().toLowerCase(),
      );
      setNameExistingMatch(match);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameInput, event.participants]);

  // Active drag mode (lifted from DragGrid)
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(
    initialEvent.mode === 'unavailable' ? 0 : 2,
  );

  // Heatmap filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialEvent.participants.map((p) => p.id)),
  );
  const [userIncludeIfNeeded, setUserIncludeIfNeeded] = useState(true);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);
  const [showBestTimes, setShowBestTimes] = useState(false);

  // 1명 단독 또는 호버 미리보기 시 If Needed 강제 ON
  const isSingleSelection = selectedIds.size === 1;
  const effectiveIncludeIfNeeded = hoveredParticipantId !== null || isSingleSelection
    ? true
    : userIncludeIfNeeded;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetPid, setDeleteTargetPid] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Session (localStorage)
  const [session, setSession] = useState(() => {
    if (initialState.type === 'password') return null;
    const s = readStoredSession(eventId);
    if (s && initialEvent.participants.find((p) => p.id === s.participantId)) return s;
    return null;
  });

  const [participantId, setParticipantId] = useState<string | null>(session?.participantId ?? null);
  const [participantPassword, setParticipantPassword] = useState<string | null>(session?.password ?? null);
  const [namePassword, setNamePassword] = useState('');
  const [availability, setAvailability] = useState<Availability>(() => {
    if (!session) return {};
    const existing = initialEvent.participants.find((p) => p.id === session.participantId);
    return existing?.availability ?? {};
  });

  const { saving, saveNow } = useAvailabilitySave({
    eventId,
    participantId,
    participantPassword,
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

  useRealtimeSync(eventId, viewMode === 'view', handleRealtimeUpdate);

  // Best times: timeful style — find max count, only show slots matching max
  const bestSlots = useMemo(() => {
    const filtered = event.participants.filter((p) => selectedIds.has(p.id));
    if (filtered.length === 0) return new Set<string>();

    const slots = generateSlots(event.time_start, event.time_end);
    let maxCount = 0;
    const slotCounts: { key: string; count: number }[] = [];

    const isUnavailableMode = event.mode === 'unavailable';
    for (const date of event.dates) {
      for (const slot of slots) {
        let count = 0;
        for (const p of filtered) {
          const val = p.availability?.[date]?.[String(slot)];
          if (isUnavailableMode) {
            if (val !== 0) count++;
          } else {
            if (val === 2) count++;
            else if (val === 1 && effectiveIncludeIfNeeded) count++;
          }
        }
        if (count > 0) {
          slotCounts.push({ key: `${date}-${slot}`, count });
          if (count > maxCount) maxCount = count;
        }
      }
    }

    // Only slots with the maximum count are "best"
    return new Set(slotCounts.filter((s) => s.count === maxCount).map((s) => s.key));
  }, [event, selectedIds, effectiveIncludeIfNeeded]);

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

  const mobileSlotAvailability = useMemo(() => {
    if (!mobileSlotSheet) return undefined;
    const map = new Map<string, 0 | 1 | 2>();
    for (const p of event.participants) {
      const val = p.availability?.[mobileSlotSheet.date]?.[String(mobileSlotSheet.slot)];
      map.set(p.id, (val as 0 | 1 | 2) ?? 0);
    }
    return map;
  }, [mobileSlotSheet, event.participants]);

  function getSlotAvailability(date: string, slot: number) {
    const map = new Map<string, 0 | 1 | 2>();
    for (const p of event.participants) {
      const val = p.availability?.[date]?.[String(slot)];
      map.set(p.id, (val as 0 | 1 | 2) ?? 0);
    }
    return map;
  }

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
              setParticipantPassword(stored.password ?? null);
              setAvailability(existing.availability);
            }
          }
        }}
      />
    );
  }

  // Auto-join with Google name (no name modal needed, no password for Google users)
  async function autoJoinWithName(name: string) {
    setNameLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      setParticipantId(data.id);
      setParticipantPassword(null);
      setSession({ participantId: data.id, name: data.name, password: null });
      upsertSession(eventId, { pid: data.id, name: data.name, password: null });
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
    setHoveredSlot(null);
    setHoverRect(null);
    setMobileSlotSheet(null);
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
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), password: namePassword || undefined }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          const errData = await res.json();
          if (errData.requires_password) {
            setNameError('이 이름은 비밀번호가 설정되어 있습니다. 비밀번호를 입력해주세요.');
            return;
          }
          setNameError(errData.error || '비밀번호가 일치하지 않습니다');
          return;
        }
        const errData = await res.json();
        setNameError(errData.error || '참여에 실패했습니다');
        return;
      }

      const data = await res.json();
      setParticipantId(data.id);
      setParticipantPassword(namePassword || null);
      setSession({ participantId: data.id, name: data.name, password: namePassword || null });
      upsertSession(eventId, { pid: data.id, name: data.name, password: namePassword || null });

      if (data.numbered === true) {
        setNameError('');
        // Brief info: numbered participant joined (no action needed)
      }

      if (data.existing) {
        const existingP = event.participants.find((p) => p.id === data.id);
        if (existingP) setAvailability(existingP.availability);
      }

      addEventToHistory({
        id: eventId,
        title: event.title,
        dates: event.dates,
        role: 'participant',
        participantCount: event.participants.length,
        lastVisited: new Date().toISOString(),
      });

      setShowNameModal(false);
      setNameInput('');
      setNamePassword('');
      setViewMode('edit');
    } finally {
      setNameLoading(false);
    }
  }

  function handleAvailabilityChange(newAvailability: Availability) {
    setAvailability(newAvailability);
    // No auto-save here — saving happens only on 편집 완료
  }

  function handleCancelEditing() {
    const savedAvailability = event.participants.find((p) => p.id === participantId)?.availability ?? {};
    setAvailability(savedAvailability);
    setViewMode('view');
  }

  async function handleFinishEditing() {
    await saveNow(availability);
    // Refresh event data to show updated heatmap and participant list
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setSelectedIds(new Set(data.participants.map((p: { id: string }) => p.id)));
      }
    } catch { /* ignore */ }
    setViewMode('view');
  }

  async function handleDeleteParticipant(pid: string) {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${pid}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setDeleteTargetPid(null);
        return;
      }
      // Refresh event data
      const refreshRes = await fetch(`/api/events/${eventId}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setEvent(data);
        setSelectedIds(new Set(data.participants.map((p: { id: string }) => p.id)));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTargetPid(null);
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/e/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  async function saveDescription() {
    await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setEvent((prev) => ({ ...prev, description }));
    setEditingDescription(false);
  }

  // Date range display
  const sortedDates = [...event.dates].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  const isDayOfWeekMode = event.dates.some(isDayOfWeekKey);
  const fmtShort = (d: string) => {
    if (isDayOfWeekKey(d)) return DAY_OF_WEEK_LABELS[d];
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  const dateRange = isDayOfWeekMode
    ? event.dates.map((d) => DAY_OF_WEEK_LABELS[d] ?? d).join(', ')
    : firstDate === lastDate
      ? fmtShort(firstDate)
      : `${fmtShort(firstDate)} – ${fmtShort(lastDate)}`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Event header — timeful style */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
          <p className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{dateRange}</span>
            {event.is_owner && (
              <span
                onClick={() => setShowEditModal(true)}
                className="text-teal-600 hover:text-teal-800 cursor-pointer"
              >이벤트 수정</span>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label={copied ? '링크 복사됨' : '링크 복사'}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:hidden"
            >
              {copied ? (
                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              )}
            </button>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="hidden sm:flex h-[38px] px-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer items-center gap-1.5"
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
              className="hidden lg:inline-flex h-[38px] px-5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 shadow-[var(--shadow-primary)] transition-all cursor-pointer items-center"
            >
              편집
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEditing}
                disabled={saving}
                className="hidden lg:inline-flex h-[38px] px-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed items-center"
              >
                취소
              </button>
              <button
                onClick={handleFinishEditing}
                disabled={saving}
                className="hidden lg:inline-flex h-[38px] px-5 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700 shadow-[var(--shadow-primary)] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed items-center"
              >
                {saving ? '저장 중...' : '편집 완료'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description add/edit */}
      <div className="mb-6">
        {editingDescription ? (
          <div className="mt-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이벤트 설명을 입력하세요"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:border-teal-600 resize-none dark:bg-gray-800 dark:text-gray-100"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveDescription}
                className="text-sm text-teal-600 font-medium hover:text-teal-800 cursor-pointer"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditingDescription(false);
                  setDescription(event.description ?? '');
                }}
                className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        ) : description ? (
          <p
            className={`mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors ${event.is_owner ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300' : ''}`}
            onClick={() => event.is_owner && setEditingDescription(true)}
          >
            {description}
          </p>
        ) : event.is_owner ? (
          <p
            className="mt-2 text-sm text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={() => setEditingDescription(true)}
          >
            + 설명 추가
          </p>
        ) : null}
      </div>

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
                  : 'bg-teal-50 text-teal-700 border border-teal-200'
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
                activeMode={activeMode}
                onActiveModeChange={setActiveMode}
                disabled={saving}
              />
            </>
          ) : event.date_only ? (
            <>
              <HeatmapLegend total={selectedIds.size} mode={event.mode} />
              <CalendarHeatmapGrid
                dates={event.dates}
                participants={event.participants}
                selectedIds={selectedIds}
                includeIfNeeded={effectiveIncludeIfNeeded}
                hoveredParticipantId={hoveredParticipantId}
                onCellHover={(date) => {
                  participantFilterRef.current?.previewSlot(date ? getSlotAvailability(date, 0) : null);
                  setHoveredSlot(date ? { date, slot: 0 } : null);
                }}
                bestSlots={showBestTimes ? bestSlots : undefined}
                eventMode={event.mode}
              />
            </>
          ) : (
            <>
              <HeatmapLegend total={selectedIds.size} mode={event.mode} />
              <HeatmapGrid
              dates={event.dates}
              timeStart={event.time_start}
              timeEnd={event.time_end}
              participants={event.participants}
              selectedIds={selectedIds}
              includeIfNeeded={effectiveIncludeIfNeeded}
              hoveredParticipantId={hoveredParticipantId}
              onCellHover={(date, slot, rect) => {
                participantFilterRef.current?.previewSlot(date ? getSlotAvailability(date, slot!) : null);
                setHoveredSlot(date ? { date, slot: slot! } : null);
                setHoverRect(rect ?? null);
              }}
              onCellSelect={(date, slot) => setMobileSlotSheet({ date, slot })}
              bestSlots={showBestTimes ? bestSlots : undefined}
              eventMode={event.mode}
              />
            </>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="hidden lg:block w-full lg:w-80 shrink-0 lg:pt-10 lg:pl-6 lg:border-l lg:border-gray-100 dark:lg:border-gray-700">
          {viewMode === 'edit' ? (
            <>
              {/* Mode selector toggle + highlight */}
              {event.mode === 'unavailable' ? (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium mb-5">
                  ✓ 안 되는 시간을 드래그하세요
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <SegmentedControl
                      options={[
                        { value: 'available', label: 'Available' },
                        { value: 'if_needed', label: 'If Needed' },
                      ]}
                      value={activeMode === 2 ? 'available' : 'if_needed'}
                      onChange={(v) => setActiveMode(v === 'available' ? 2 : 1)}
                    />
                  </div>
                  <div className={`p-3 rounded-lg text-sm mb-5 ${
                    activeMode === 2 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <div className="font-medium">
                      {activeMode === 2 ? '✓ 되는 시간을 드래그하세요' : '✓ If Needed 시간을 드래그하세요'}
                    </div>
                    {activeMode === 1 && (
                      <div className="mt-1 text-xs text-amber-700/80 leading-relaxed">
                        가능은 하지만 우선순위가 낮은 시간. 다른 사람들과 잘 맞지 않으면 이 시간에라도 모일 수 있어요.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Legend */}
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">범례</h3>
                <div className="flex flex-col gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-sm bg-teal-400/60 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span>Available</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                        확실히 가능한 시간
                      </span>
                    </div>
                  </div>
                  {event.mode !== 'unavailable' && (
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-sm bg-amber-300/50 mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span>If Needed</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                          가능은 하지만 우선순위 낮음
                        </span>
                      </div>
                    </div>
                  )}
                  {event.mode === 'unavailable' && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm bg-red-400/50" />
                      <span>Unavailable</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Participant list in edit mode — same interaction as view mode */}
              {event.participants.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    응답자 ({event.participants.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    <ParticipantFilter
                      participants={event.participants}
                      selectedIds={new Set(event.participants.map(p => p.id))}
                      onSelectedChange={() => {}}
                    />
                  </div>
                </div>
              )}

              {/* Calendar import */}
              <div className="mb-5">
                <CalendarImportButton
                  dates={event.dates}
                  timeStart={event.time_start}
                  timeEnd={event.time_end}
                  onImport={handleAvailabilityChange}
                />
              </div>

              {/* Delete availability */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-700 cursor-pointer mt-4"
              >
                내 응답 삭제
              </button>
            </>
          ) : (
            <>
              {/* View mode sidebar — responses + options */}
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
                응답자 ({event.participants.length})
              </h2>

              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <ParticipantFilter
                  ref={participantFilterRef}
                  participants={event.participants}
                  selectedIds={selectedIds}
                  onSelectedChange={setSelectedIds}
                  onHover={setHoveredParticipantId}
                  onHoverEnd={() => setHoveredParticipantId(null)}
                  onDelete={event.is_owner ? (pid) => setDeleteTargetPid(pid) : undefined}
                />
              </div>

              {/* Options */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">옵션</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowBestTimes(!showBestTimes)}
                    className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 cursor-pointer min-h-11"
                  >
                    <span>최적 시간만 보기</span>
                    <ToggleSwitch checked={showBestTimes} />
                  </button>
                  {event.mode !== 'unavailable' && (
                    <button
                      onClick={() => !isSingleSelection && setUserIncludeIfNeeded(!userIncludeIfNeeded)}
                      disabled={isSingleSelection}
                      className={`flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 min-h-11 ${
                        isSingleSelection ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <span>
                        &quot;If Needed&quot; 숨기기
                        {isSingleSelection && (
                          <span className="ml-1 text-[10px] text-gray-400">(1명 단독 시 자동 표시)</span>
                        )}
                      </span>
                      <ToggleSwitch checked={!effectiveIncludeIfNeeded} />
                    </button>
                  )}
                </div>
              </div>

            </>
          )}

        </div>
      </div>

      {/* Edit event modal */}
      <EventFormModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        editEvent={{
          id: eventId,
          title: event.title,
          dates: event.dates,
          time_start: event.time_start,
          time_end: event.time_end,
          mode: event.mode,
          date_only: event.date_only,
        }}
        onEventUpdated={() => {
          setShowEditModal(false);
          fetch(`/api/events/${eventId}`)
            .then((r) => r.json())
            .then((data) => setEvent(data));
        }}
      />

      {/* Name input modal */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLElement).dataset.bd = '1'; }}
            onClick={(e) => { if (e.target === e.currentTarget && (e.currentTarget as HTMLElement).dataset.bd === '1') { setShowNameModal(false); setNameInput(''); setNamePassword(''); } (e.currentTarget as HTMLElement).dataset.bd = ''; }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">내 시간 입력하기</h2>
                <button
                  onClick={() => { setShowNameModal(false); setNameInput(''); setNamePassword(''); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">이름을 입력하거나 Google 계정으로 로그인하세요.</p>

                <form onSubmit={handleNameSubmit}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError(''); }}
                    placeholder="이름 입력"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md focus:border-teal-600 transition-all dark:bg-gray-800 dark:text-gray-100"
                    autoFocus
                    maxLength={50}
                  />
                  <AnimatePresence>
                    {nameExistingMatch && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm text-amber-600 mt-2"
                      >
                        응답 기록이 있는 사용자입니다. 기존 시간표를 수정합니다.
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <div className="mt-3">
                    <input
                      type="password"
                      value={namePassword}
                      onChange={(e) => setNamePassword(e.target.value)}
                      placeholder="비밀번호 (선택사항)"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md focus:border-teal-600 transition-all dark:bg-gray-800 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">설정하면 다른 사람이 내 응답을 수정할 수 없습니다</p>
                  </div>
                  {nameError && <p className="text-sm text-red-500 mt-2">{nameError}</p>}
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">또는</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                </div>

                {/* Google login button */}
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = createAuthBrowserClient();
                    await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: `${window.location.origin}/auth/callback?next=/e/${eventId}` },
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 dark:bg-gray-800"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google로 계속하기
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowNameModal(false); setNameInput(''); setNamePassword(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleNameSubmit}
                  disabled={nameLoading || !nameInput.trim()}
                  className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-[var(--shadow-primary)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {nameLoading ? '참여 중...' : nameExistingMatch ? '수정하기' : '참여하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showDeleteConfirm}
        title="응답 삭제"
        message="내 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => {
          handleAvailabilityChange({});
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Delete participant confirm modal (owner only) */}
      <ConfirmModal
        open={!!deleteTargetPid}
        title="응답자 삭제"
        message={`${event.participants.find(p => p.id === deleteTargetPid)?.name ?? ''}의 응답을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={() => { if (deleteTargetPid) handleDeleteParticipant(deleteTargetPid); }}
        onCancel={() => setDeleteTargetPid(null)}
      />

      {/* Mobile bottom bar */}
      <MobileBottomBar
        isEditMode={viewMode === 'edit'}
        onToggleMode={viewMode === 'edit' ? handleFinishEditing : handleEditClick}
        onCancelEdit={handleCancelEditing}
        saving={saving}
        dates={event.dates}
        timeStart={event.time_start}
        timeEnd={event.time_end}
        onCalendarImport={handleAvailabilityChange}
      />

      <AnimatePresence>
        {viewMode === 'view' && mobileSlotSheet && mobileSlotAvailability && !event.date_only && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 36 || info.velocity.y > 450) setMobileSlotSheet(null);
            }}
            className="fixed inset-x-0 bottom-[72px] z-30 overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:hidden"
          >
            <div className="flex justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="max-h-[48vh] overflow-y-auto px-5 pb-5 pt-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    응답자 ({Array.from(mobileSlotAvailability.values()).filter((v) => v === 2 || (v === 1 && effectiveIncludeIfNeeded)).length}/{event.participants.length})
                  </h3>
                  <p className="mt-0.5 text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
                    {formatDateCompact(mobileSlotSheet.date)} · {slotToTime(mobileSlotSheet.slot)} – {slotToTime(mobileSlotSheet.slot + 1)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSlotSheet(null)}
                  className="rounded-md px-2 py-1 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  닫기
                </button>
              </div>
              <ParticipantFilter
                participants={event.participants}
                selectedIds={selectedIds}
                onSelectedChange={setSelectedIds}
                slotAvailability={mobileSlotAvailability}
                onDelete={event.is_owner ? (pid) => setDeleteTargetPid(pid) : undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacer for mobile bottom bar */}
      <div className="h-24 lg:hidden" />

      {/* Toast for copy */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg lg:bottom-6"
          >
            링크가 복사되었습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover info popover (view mode only — edit mode shows sidebar instead) */}
      {viewMode === 'view' && hoveredSlot && hoverRect && !event.date_only && (
        <HoverInfoPopover position={hoverRect}>
          <SlotHoverInfo
            date={hoveredSlot.date}
            slot={hoveredSlot.slot}
          />
        </HoverInfoPopover>
      )}
    </div>
  );
}

interface SlotHoverInfoProps {
  date: string;
  slot: number;
  participants?: { id: string; name: string; availability?: Record<string, Record<string, 0 | 1 | 2>> }[];
  selectedIds?: Set<string>;
  includeIfNeeded?: boolean;
  mode?: 'available' | 'unavailable';
}

function SlotHoverInfo({ date, slot, participants = [], selectedIds = new Set<string>(), includeIfNeeded = false, mode = 'available' }: SlotHoverInfoProps) {
  const filtered = participants.filter((p) => selectedIds.has(p.id));
  const dateLabel = formatDateCompact(date);
  const timeLabel = `${slotToTime(slot)} – ${slotToTime(slot + 1)}`;

  const available: string[] = [];
  const ifNeeded: string[] = [];
  const unavailable: string[] = [];
  const noResponse: string[] = [];

  for (const p of filtered) {
    const val = p.availability?.[date]?.[String(slot)];
    if (val === 2) available.push(p.name);
    else if (val === 1) ifNeeded.push(p.name);
    else if (val === 0) unavailable.push(p.name);
    else noResponse.push(p.name);
  }

  return (
    <div className="whitespace-nowrap">
      <div className="font-semibold text-[11px] tabular-nums">
        {dateLabel} · {timeLabel}
      </div>
      {mode === 'unavailable' ? (
        <>
          {(available.length + noResponse.length) > 0 && (
            <Row dotClass="bg-teal-400" label={`가능 ${available.length + noResponse.length}명`} names={[...available, ...noResponse]} />
          )}
          {unavailable.length > 0 && (
            <Row dotClass="bg-red-400" label={`불가능 ${unavailable.length}명`} names={unavailable} />
          )}
        </>
      ) : (
        <>
          {available.length > 0 && (
            <Row dotClass="bg-teal-400" label={`가능 ${available.length}명`} names={available} />
          )}
          {includeIfNeeded && ifNeeded.length > 0 && (
            <Row dotClass="bg-amber-300" label={`If Needed ${ifNeeded.length}명`} names={ifNeeded} />
          )}
          {(filtered.length - available.length - (includeIfNeeded ? ifNeeded.length : 0)) > 0 && (
            <div className="text-[11px] text-white/55">
              나머지 {filtered.length - available.length - (includeIfNeeded ? ifNeeded.length : 0)}명 무응답/불가
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const transition = mountedRef.current ? 'transition-colors duration-200' : '';
  const knobTransition = mountedRef.current ? 'transition-transform duration-200' : '';

  return (
    <div className={`w-9 h-5 rounded-full relative ${transition} ${checked ? 'bg-teal-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm ${knobTransition} ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </div>
  );
}

function Row({ dotClass, label, names }: { dotClass: string; label: string; names: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="text-[11px] font-medium text-white/85">{label}</span>
      </div>
      <div className="text-[11px] text-white/70 ml-3 leading-tight">{names.slice(0, 5).join(', ')}{names.length > 5 ? ` 외 ${names.length - 5}명` : ''}</div>
    </div>
  );
}
