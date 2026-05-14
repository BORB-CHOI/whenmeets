'use client';

import { useMemo, useState } from 'react';
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
    key: 'created',
    label: '내가 만든 이벤트',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'participated',
    label: '참여한 이벤트',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const NO_FOLDER_KEY = '__no_folder__';

export default function DashboardClient({
  createdEvents: initialCreated,
  participatedEvents,
  folders: initialFolders,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('created');
  const [createdEvents, setCreatedEvents] = useState(initialCreated);
  const [folders, setFolders] = useState(initialFolders);
  const [animateTab, setAnimateTab] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const events = activeTab === 'created' ? createdEvents : participatedEvents;
  const deleteTarget = deleteTargetId ? createdEvents.find((e) => e.id === deleteTargetId) ?? null : null;
  const deleteFolder = deleteFolderId ? folders.find((f) => f.id === deleteFolderId) ?? null : null;

  // Group events into folders (only meaningful on "created" tab).
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

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
        setCreatedEvents((prev) =>
          prev.map((e) =>
            e.folder_id === deleteFolderId ? { ...e, folder_id: null } : e,
          ),
        );
      }
    } finally {
      setDeletingFolder(false);
      setDeleteFolderId(null);
    }
  }

  async function handleMoveEvent(folderId: string | null) {
    if (!moveTarget || moving) return;
    setMoveError('');
    setMoving(true);
    try {
      const res = await fetch(`/api/events/${moveTarget.id}/folder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMoveError(data.error || '이동에 실패했습니다');
        return;
      }
      setCreatedEvents((prev) =>
        prev.map((e) => (e.id === moveTarget.id ? { ...e, folder_id: folderId } : e)),
      );
      setMoveTarget(null);
    } finally {
      setMoving(false);
    }
  }

  // For the "created" tab we render folder groups + No folder.
  // For the "participated" tab we render a single flat list.
  const showFolders = activeTab === 'created';
  const orderedGroupKeys: string[] = showFolders
    ? [...folders.map((f) => f.id), NO_FOLDER_KEY]
    : [];

  return (
    <div>
      {/* Tab bar + Folder action */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative inline-grid grid-cols-2 gap-1 p-1 bg-gray-50 rounded-full border border-gray-200">
          <div
            className={`absolute top-1 bottom-1 bg-white rounded-full border border-teal-600 shadow-sm ${
              animateTab ? 'transition-transform duration-200 ease-out' : ''
            }`}
            style={{
              left: 4,
              width: 'calc((100% - 8px) / 2)',
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
              className={`relative z-10 px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-teal-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
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
              return (
                <div key={key}>
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
                              이 폴더에는 아직 이벤트가 없습니다.
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
                                canDelete={activeTab === 'created'}
                                isOwner={event.is_owner}
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
