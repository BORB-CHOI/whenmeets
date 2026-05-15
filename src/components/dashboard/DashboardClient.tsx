'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import EventCard from './EventCard';
import FolderHeader from './FolderHeader';
import FolderNameModal from './FolderNameModal';
import MoveToFolderModal from './MoveToFolderModal';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface EventItem {
  id: string;
  title: string;
  dates: string[];
  created_at: string;
  participant_count: number;
  folder_id: string | null;
  is_owner: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  position: number;
}

interface DashboardClientProps {
  createdEvents: EventItem[];
  participatedEvents: EventItem[];
  folders: FolderItem[];
}

const tabs = [
  {
    key: 'all',
    label: '전체 이벤트',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
  {
    key: 'created',
    label: '내가 만든 이벤트',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const NO_FOLDER_KEY = '__no_folder__';
const COLLAPSED_STORAGE_KEY = 'whenmeets:dashboard:collapsedFolders';

function readPersistedCollapsed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

export default function DashboardClient({
  createdEvents: initialCreated,
  participatedEvents: initialParticipated,
  folders: initialFolders,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [createdEvents, setCreatedEvents] = useState(initialCreated);
  const [participatedEvents, setParticipatedEvents] = useState(initialParticipated);
  const [folders, setFolders] = useState(initialFolders);
  const [animateTab, setAnimateTab] = useState(false);
  // Lazy initializer reads localStorage once on mount — survives reloads + return visits.
  // SSR pass returns an empty Set; on hydration the client reads persisted state.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readPersistedCollapsed());

  // Persist on every change. Stored as a JSON array of group keys (folder IDs + NO_FOLDER_KEY).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        COLLAPSED_STORAGE_KEY,
        JSON.stringify(Array.from(collapsed)),
      );
    } catch {
      // Quota / privacy mode — collapsed state is non-critical, swallow.
    }
  }, [collapsed]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [folderModalState, setFolderModalState] = useState<
    | { type: 'create' }
    | { type: 'rename'; folderId: string; initialName: string }
    | null
  >(null);
  const [folderError, setFolderError] = useState('');
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const [moveTarget, setMoveTarget] = useState<EventItem | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState('');

  // Drag-and-drop state
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);

  // The visible event set per tab.
  // Folder structure is per-user (see migration 013: user_event_folders) —
  // every event has a folder_id that reflects THIS user's organization,
  // including events the user only participates in. So all 3 tabs can
  // support folder grouping and drag-and-drop equally.
  const events = useMemo(() => {
    if (activeTab === 'all') {
      const byId = new Map<string, EventItem>();
      for (const e of participatedEvents) byId.set(e.id, e);
      for (const e of createdEvents) byId.set(e.id, e);
      return Array.from(byId.values()).sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      );
    }
    return createdEvents;
  }, [activeTab, createdEvents, participatedEvents]);

  const deleteTarget = deleteTargetId
    ? events.find((e) => e.id === deleteTargetId) ?? null
    : null;
  const deleteFolder = deleteFolderId ? folders.find((f) => f.id === deleteFolderId) ?? null : null;

  // Folders apply to every tab — even 참여한 이벤트, since the user owns the
  // folder structure and decides where to file events they joined.
  const showFolders = true;

  const grouped = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const f of folders) map.set(f.id, []);
    map.set(NO_FOLDER_KEY, []);
    for (const e of events) {
      const key = e.folder_id && map.has(e.folder_id) ? e.folder_id : NO_FOLDER_KEY;
      map.get(key)!.push(e);
    }
    return map;
  }, [events, folders]);

  const orderedGroupKeys: string[] = showFolders
    ? [...folders.map((f) => f.id), NO_FOLDER_KEY]
    : [];

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expand(key: string) {
    setCollapsed((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${deleteTargetId}`, { method: 'DELETE' });
      if (res.ok) {
        setCreatedEvents((prev) => prev.filter((e) => e.id !== deleteTargetId));
        setParticipatedEvents((prev) => prev.filter((e) => e.id !== deleteTargetId));
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  }

  async function handleFolderSubmit(name: string) {
    if (!folderModalState) return;
    setFolderError('');
    setFolderSubmitting(true);
    try {
      if (folderModalState.type === 'create') {
        const res = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFolderError(data.error || '폴더를 만들 수 없습니다');
          return;
        }
        const { folder } = await res.json();
        setFolders((prev) => [...prev, folder]);
        setFolderModalState(null);
        router.refresh();
      } else {
        const res = await fetch(`/api/folders/${folderModalState.folderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFolderError(data.error || '이름을 변경할 수 없습니다');
          return;
        }
        setFolders((prev) =>
          prev.map((f) =>
            f.id === folderModalState.folderId ? { ...f, name } : f,
          ),
        );
        setFolderModalState(null);
        router.refresh();
      }
    } finally {
      setFolderSubmitting(false);
    }
  }

  async function handleConfirmDeleteFolder() {
    if (!deleteFolderId || deletingFolder) return;
    setDeletingFolder(true);
    try {
      const res = await fetch(`/api/folders/${deleteFolderId}`, { method: 'DELETE' });
      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== deleteFolderId));
        // CASCADE on user_event_folders drops the rows; mirror that client-side.
        setCreatedEvents((prev) =>
          prev.map((e) =>
            e.folder_id === deleteFolderId ? { ...e, folder_id: null } : e,
          ),
        );
        setParticipatedEvents((prev) =>
          prev.map((e) =>
            e.folder_id === deleteFolderId ? { ...e, folder_id: null } : e,
          ),
        );
        router.refresh();
      }
    } finally {
      setDeletingFolder(false);
      setDeleteFolderId(null);
    }
  }

  async function moveEvent(eventId: string, folderId: string | null): Promise<boolean> {
    const event =
      createdEvents.find((e) => e.id === eventId) ??
      participatedEvents.find((e) => e.id === eventId);
    if (!event) return false;
    if (event.folder_id === folderId) return true;

    const prevFolderId = event.folder_id;
    // Optimistic update — same event may live in both lists, so update both.
    const apply = (list: EventItem[]) =>
      list.map((e) => (e.id === eventId ? { ...e, folder_id: folderId } : e));
    setCreatedEvents(apply);
    setParticipatedEvents(apply);

    const res = await fetch(`/api/events/${eventId}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    });

    if (!res.ok) {
      const revert = (list: EventItem[]) =>
        list.map((e) => (e.id === eventId ? { ...e, folder_id: prevFolderId } : e));
      setCreatedEvents(revert);
      setParticipatedEvents(revert);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleMoveEvent(folderId: string | null) {
    if (!moveTarget || moving) return;
    setMoveError('');
    setMoving(true);
    try {
      const ok = await moveEvent(moveTarget.id, folderId);
      if (!ok) {
        setMoveError('이동에 실패했습니다');
        return;
      }
      setMoveTarget(null);
    } finally {
      setMoving(false);
    }
  }

  // Drag handlers
  function handleDragStart(eventId: string) {
    setDraggingEventId(eventId);
  }
  function handleDragEnd() {
    setDraggingEventId(null);
    setDragOverKey(null);
  }
  async function handleDropOnFolder(groupKey: string) {
    const eventId = draggingEventId;
    setDragOverKey(null);
    setDraggingEventId(null);
    if (!eventId) return;
    const folderId = groupKey === NO_FOLDER_KEY ? null : groupKey;
    const ok = await moveEvent(eventId, folderId);
    if (ok) expand(groupKey);
  }

  // Every event the user can see is draggable — folder structure is per-user,
  // so dragging only rearranges THIS user's view (events.folder_id is not
  // touched; user_event_folders mapping is updated). Other users unaffected.
  function isDraggableEvent(_e: EventItem) {
    return true;
  }

  return (
    <div>
      {/* Tab bar + Folder action */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className="relative inline-grid gap-1 p-1 bg-gray-50 rounded-full border border-gray-200"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          <div
            className={`absolute top-1 bottom-1 bg-white rounded-full border border-teal-600 shadow-sm ${
              animateTab ? 'transition-transform duration-200 ease-out' : ''
            }`}
            style={{
              left: 4,
              width: `calc((100% - 8px) / ${tabs.length})`,
              transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
            }}
          />
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setAnimateTab(true);
                setActiveTab(tab.key);
              }}
              title={tab.label}
              aria-label={tab.label}
              className={`relative z-10 px-3 sm:px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {showFolders && (
          <button
            type="button"
            onClick={() => {
              setFolderError('');
              setFolderModalState({ type: 'create' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75v6m3-3h-6" />
            </svg>
            새 폴더
          </button>
        )}
      </div>

      {/* Lists */}
      <div className="mt-6">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">아직 이벤트가 없습니다.</p>
            <p className="text-gray-300 text-xs mt-1">상단의 이벤트 만들기 버튼으로 시작하세요</p>
          </div>
        ) : showFolders ? (
          <div className="space-y-4">
            {orderedGroupKeys.map((key) => {
              const folder = folders.find((f) => f.id === key);
              const list = grouped.get(key) ?? [];
              const isNoFolder = key === NO_FOLDER_KEY;
              const isCollapsed = collapsed.has(key);
              const isDropTarget = !!draggingEventId;
              const isDragOver = dragOverKey === key;
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    if (!draggingEventId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverKey !== key) setDragOverKey(key);
                  }}
                  onDragLeave={(e) => {
                    if (!draggingEventId) return;
                    const next = e.relatedTarget as Node | null;
                    if (next && (e.currentTarget as Node).contains(next)) return;
                    setDragOverKey((curr) => (curr === key ? null : curr));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnFolder(key);
                  }}
                  className={`rounded-lg transition-colors ${
                    isDropTarget
                      ? isDragOver
                        ? 'ring-2 ring-teal-400 bg-teal-50/60'
                        : 'ring-1 ring-dashed ring-gray-200'
                      : ''
                  }`}
                >
                  <FolderHeader
                    name={isNoFolder ? '폴더 없음' : folder?.name ?? '폴더'}
                    count={list.length}
                    collapsed={isCollapsed}
                    onToggle={() => toggleCollapsed(key)}
                    onRename={
                      isNoFolder
                        ? undefined
                        : () => {
                            setFolderError('');
                            setFolderModalState({
                              type: 'rename',
                              folderId: key,
                              initialName: folder?.name ?? '',
                            });
                          }
                    }
                    onDelete={isNoFolder ? undefined : () => setDeleteFolderId(key)}
                  />
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-3 pt-2 pl-1">
                          {list.length === 0 ? (
                            <p className="text-sm text-gray-400 px-2 py-3">
                              {isDropTarget
                                ? '여기에 놓으면 이 폴더로 이동합니다'
                                : '이 폴더에는 아직 이벤트가 없습니다.'}
                            </p>
                          ) : (
                            list.map((event) => (
                              <EventCard
                                key={event.id}
                                id={event.id}
                                title={event.title}
                                dateCount={event.dates.length}
                                participantCount={event.participant_count}
                                createdAt={event.created_at}
                                canDelete={event.is_owner}
                                isOwner={event.is_owner}
                                draggable={isDraggableEvent(event)}
                                isDragging={draggingEventId === event.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onRequestDelete={(id) => setDeleteTargetId(id)}
                                onRequestMove={() => {
                                  setMoveError('');
                                  setMoveTarget(event);
                                }}
                              />
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
                canDelete={false}
                isOwner={event.is_owner}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirms */}
      <ConfirmModal
        open={!!deleteTargetId}
        title="이벤트 삭제"
        message={`${deleteTarget?.title ?? ''}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel={isDeleting ? '삭제 중...' : '삭제'}
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setDeleteTargetId(null);
        }}
      />

      <ConfirmModal
        open={!!deleteFolderId}
        title="폴더 삭제"
        message={`'${deleteFolder?.name ?? ''}' 폴더를 삭제하시겠습니까? 이 폴더의 이벤트는 '폴더 없음'으로 이동합니다.`}
        confirmLabel={deletingFolder ? '삭제 중...' : '삭제'}
        variant="danger"
        onConfirm={handleConfirmDeleteFolder}
        onCancel={() => {
          if (!deletingFolder) setDeleteFolderId(null);
        }}
      />

      <FolderNameModal
        open={folderModalState !== null}
        mode={folderModalState?.type ?? 'create'}
        initialName={
          folderModalState?.type === 'rename' ? folderModalState.initialName : ''
        }
        submitting={folderSubmitting}
        error={folderError}
        onSubmit={handleFolderSubmit}
        onClose={() => {
          if (!folderSubmitting) {
            setFolderModalState(null);
            setFolderError('');
          }
        }}
      />

      <MoveToFolderModal
        open={!!moveTarget}
        folders={folders}
        currentFolderId={moveTarget?.folder_id ?? null}
        submitting={moving}
        error={moveError}
        eventTitle={moveTarget?.title ?? ''}
        onSubmit={handleMoveEvent}
        onClose={() => {
          if (!moving) {
            setMoveTarget(null);
            setMoveError('');
          }
        }}
      />
    </div>
  );
}
