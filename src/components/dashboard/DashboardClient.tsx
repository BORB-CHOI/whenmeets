'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import EventCard from './EventCard';
import FolderHeader from './FolderHeader';
import FolderNameModal from './FolderNameModal';
import MoveToFolderModal from './MoveToFolderModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { eventsApi, foldersApi } from '@/lib/api-client';
import { ApiClientError } from '@/lib/api-client/client';

interface EventItem {
  id: string;
  title: string;
  dates: string[];
  created_at: string;
  participant_count: number;
  folder_id: string | null;
  is_owner: boolean;
  order_position: number | null;
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
  noFolderPosition: number | null;
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
const COLLAPSED_STORAGE_KEY = 'daymeet:dashboard:collapsedFolders';
const CARD_ID_PREFIX = 'event-';

function cardId(eventId: string) {
  return `${CARD_ID_PREFIX}${eventId}`;
}

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

function computeOrderedKeys(folders: FolderItem[], noFolderPosition: number | null): string[] {
  if (noFolderPosition === null) {
    return [...folders.map((f) => f.id), NO_FOLDER_KEY];
  }
  type Entry = { key: string; position: number; tieBreaker: number };
  const entries: Entry[] = [
    ...folders.map((f, idx) => ({ key: f.id, position: f.position, tieBreaker: idx })),
    { key: NO_FOLDER_KEY, position: noFolderPosition, tieBreaker: Number.POSITIVE_INFINITY },
  ];
  entries.sort((a, b) => a.position - b.position || a.tieBreaker - b.tieBreaker);
  return entries.map((e) => e.key);
}

interface DraggableGroupProps {
  groupKey: string;
  children: (args: {
    dragHandle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
    isDragging: boolean;
  }) => React.ReactNode;
}

// Folder group: same drag pattern as cards.
// - useDraggable: folder can be dragged via its header handle
// - top/bottom half useDroppable for folder-drop indicator (folder reorder)
// - separate inner useDroppable (folder-{key}) to receive card drops (cross-folder move)
function DraggableGroup({ groupKey, children }: DraggableGroupProps) {
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: groupKey,
    data: { type: 'folder', key: groupKey },
  });
  const { setNodeRef: setTopDropRef, isOver: topIsOver } = useDroppable({
    id: `folderbefore-${groupKey}`,
    data: { type: 'folder-drop', position: 'before', targetKey: groupKey },
  });
  const { setNodeRef: setBottomDropRef, isOver: bottomIsOver } = useDroppable({
    id: `folderafter-${groupKey}`,
    data: { type: 'folder-drop', position: 'after', targetKey: groupKey },
  });
  const { setNodeRef: setFolderDropRef } = useDroppable({
    id: `folder-${groupKey}`,
    data: { type: 'folder', key: groupKey },
  });

  return (
    <div ref={setDraggableRef} className="relative">
      {topIsOver && !isDragging && (
        <div className="absolute -top-2 left-0 right-0 h-0.75 bg-teal-500 rounded-full z-10 pointer-events-none shadow-[0_0_6px_rgba(0,188,212,0.5)]">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500" />
        </div>
      )}
      {bottomIsOver && !isDragging && (
        <div className="absolute -bottom-2 left-0 right-0 h-0.75 bg-teal-500 rounded-full z-10 pointer-events-none shadow-[0_0_6px_rgba(0,188,212,0.5)]">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500" />
        </div>
      )}

      <div ref={setFolderDropRef} style={{ opacity: isDragging ? 0.3 : 1 }}>
        {children({
          dragHandle: { attributes, listeners },
          isDragging,
        })}
      </div>

      <div
        ref={setTopDropRef}
        className="absolute top-0 left-0 right-0 h-1/3 pointer-events-none"
      />
      <div
        ref={setBottomDropRef}
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
      />
    </div>
  );
}

interface DraggableCardProps {
  eventId: string;
  folderKey: string;
  children: (args: {
    dragHandle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
    isDragging: boolean;
  }) => React.ReactNode;
}

function DraggableCard({ eventId, folderKey, children }: DraggableCardProps) {
  const {
    setNodeRef: setDraggableRef,
    attributes,
    listeners,
    isDragging,
  } = useDraggable({
    id: cardId(eventId),
    data: { type: 'event', eventId, folderKey },
  });
  const { setNodeRef: setTopDropRef, isOver: topIsOver } = useDroppable({
    id: `dropbefore-${eventId}`,
    data: { type: 'card-drop', position: 'before', targetEventId: eventId, folderKey },
  });
  const { setNodeRef: setBottomDropRef, isOver: bottomIsOver } = useDroppable({
    id: `dropafter-${eventId}`,
    data: { type: 'card-drop', position: 'after', targetEventId: eventId, folderKey },
  });

  return (
    <div ref={setDraggableRef} className="relative">
      {topIsOver && !isDragging && (
        <div className="absolute -top-1.5 left-0 right-0 h-0.75 bg-teal-500 rounded-full z-10 pointer-events-none shadow-[0_0_6px_rgba(0,188,212,0.5)]">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500" />
        </div>
      )}
      {bottomIsOver && !isDragging && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-0.75 bg-teal-500 rounded-full z-10 pointer-events-none shadow-[0_0_6px_rgba(0,188,212,0.5)]">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-teal-500" />
        </div>
      )}

      <div style={{ opacity: isDragging ? 0.3 : 1 }}>
        {children({
          dragHandle: { attributes, listeners },
          isDragging,
        })}
      </div>

      <div
        ref={setTopDropRef}
        className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
      />
      <div
        ref={setBottomDropRef}
        className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
      />
    </div>
  );
}

function EmptyFolderDrop({
  folderKey,
  cardDragActive,
}: {
  folderKey: string;
  cardDragActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-${folderKey}`,
    data: { type: 'folder-empty', folderKey },
  });
  return (
    <div
      ref={setNodeRef}
      className={`text-sm px-2 py-3 lg:col-span-2 rounded-md transition-colors ${
        cardDragActive
          ? isOver
            ? 'text-teal-700 bg-teal-50 border-2 border-dashed border-teal-500 text-center'
            : 'text-teal-700 bg-teal-50/40 border border-dashed border-teal-300 text-center'
          : 'text-gray-400'
      }`}
    >
      {cardDragActive
        ? '여기에 놓으면 이 폴더로 이동합니다'
        : '이 폴더에는 아직 이벤트가 없습니다.'}
    </div>
  );
}

export default function DashboardClient({
  createdEvents: initialCreated,
  participatedEvents: initialParticipated,
  folders: initialFolders,
  noFolderPosition: initialNoFolderPosition,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [createdEvents, setCreatedEvents] = useState(initialCreated);
  const [participatedEvents, setParticipatedEvents] = useState(initialParticipated);
  const [folders, setFolders] = useState(initialFolders);
  const [noFolderPosition, setNoFolderPosition] = useState<number | null>(initialNoFolderPosition);
  const [animateTab, setAnimateTab] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readPersistedCollapsed());

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

  const [activeDrag, setActiveDrag] = useState<
    | { type: 'folder'; key: string }
    | { type: 'event'; eventId: string; folderKey: string }
    | null
  >(null);

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
  );

  const events = useMemo(() => {
    if (activeTab === 'all') {
      const byId = new Map<string, EventItem>();
      for (const e of participatedEvents) byId.set(e.id, e);
      for (const e of createdEvents) byId.set(e.id, e);
      return Array.from(byId.values());
    }
    return createdEvents;
  }, [activeTab, createdEvents, participatedEvents]);

  const deleteTarget = deleteTargetId
    ? events.find((e) => e.id === deleteTargetId) ?? null
    : null;
  const deleteFolder = deleteFolderId ? folders.find((f) => f.id === deleteFolderId) ?? null : null;

  const showFolders = true;

  const grouped = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const f of folders) map.set(f.id, []);
    map.set(NO_FOLDER_KEY, []);
    for (const e of events) {
      const key = e.folder_id && map.has(e.folder_id) ? e.folder_id : NO_FOLDER_KEY;
      map.get(key)!.push(e);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ap = a.order_position;
        const bp = b.order_position;
        if (ap !== null && bp !== null) return ap - bp;
        if (ap !== null) return -1;
        if (bp !== null) return 1;
        return a.created_at < b.created_at ? 1 : -1;
      });
    }
    return map;
  }, [events, folders]);

  const orderedGroupKeys = useMemo(
    () => computeOrderedKeys(folders, noFolderPosition),
    [folders, noFolderPosition],
  );

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
      try {
        await eventsApi.remove(deleteTargetId);
        setCreatedEvents((prev) => prev.filter((e) => e.id !== deleteTargetId));
        setParticipatedEvents((prev) => prev.filter((e) => e.id !== deleteTargetId));
        router.refresh();
      } catch {
        // ignore — UI stays as-is on failure
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
        try {
          const { folder } = await foldersApi.create(name);
          setFolders((prev) => [...prev, folder]);
          setFolderModalState(null);
          router.refresh();
        } catch (err) {
          const message = err instanceof ApiClientError ? err.message : '폴더를 만들 수 없습니다';
          setFolderError(message);
          return;
        }
      } else {
        try {
          await foldersApi.rename(folderModalState.folderId, name);
          setFolders((prev) =>
            prev.map((f) =>
              f.id === folderModalState.folderId ? { ...f, name } : f,
            ),
          );
          setFolderModalState(null);
          router.refresh();
        } catch (err) {
          const message = err instanceof ApiClientError ? err.message : '이름을 변경할 수 없습니다';
          setFolderError(message);
          return;
        }
      }
    } finally {
      setFolderSubmitting(false);
    }
  }

  async function handleConfirmDeleteFolder() {
    if (!deleteFolderId || deletingFolder) return;
    setDeletingFolder(true);
    try {
      try {
        await foldersApi.remove(deleteFolderId);
        setFolders((prev) => prev.filter((f) => f.id !== deleteFolderId));
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
      } catch {
        // ignore
      }
    } finally {
      setDeletingFolder(false);
      setDeleteFolderId(null);
    }
  }

  async function moveEventToFolder(eventId: string, folderId: string | null): Promise<boolean> {
    const event =
      createdEvents.find((e) => e.id === eventId) ??
      participatedEvents.find((e) => e.id === eventId);
    if (!event) return false;
    if (event.folder_id === folderId) return true;

    const prevFolderId = event.folder_id;
    const apply = (list: EventItem[]) =>
      list.map((e) => (e.id === eventId ? { ...e, folder_id: folderId } : e));
    setCreatedEvents(apply);
    setParticipatedEvents(apply);

    try {
      await foldersApi.assignEvent(eventId, folderId);
    } catch {
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
      const ok = await moveEventToFolder(moveTarget.id, folderId);
      if (!ok) {
        setMoveError('이동에 실패했습니다');
        return;
      }
      setMoveTarget(null);
    } finally {
      setMoving(false);
    }
  }

  async function persistGroupOrder(nextKeys: string[]) {
    const order = nextKeys.map((key, index) => ({ key, position: index }));
    try {
      await foldersApi.reorder(order);
      return true;
    } catch {
      return false;
    }
  }

  const collisionDetection: CollisionDetection = (args) => {
    const activeType = args.active.data.current?.type as string | undefined;
    if (activeType === 'folder') {
      // Folder drag: only match folder-drop droppables (and exclude self).
      const selfKey = args.active.id;
      return pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) =>
            c.data.current?.type === 'folder-drop' &&
            c.data.current?.targetKey !== selfKey,
        ),
      });
    }
    // Card drag: match card-drop / folder / folder-empty (skip folder-drop).
    const filtered = {
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type !== 'folder-drop',
      ),
    };
    const pointer = pointerWithin(filtered);
    if (pointer.length > 0) return pointer;
    return rectIntersection(filtered);
  };

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { type: 'folder'; key: string }
      | { type: 'event'; eventId: string; folderKey: string }
      | undefined;
    if (!data) return;
    setActiveDrag(data);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragData = activeDrag;
    setActiveDrag(null);

    if (!dragData) return;
    const { over } = event;

    if (dragData.type === 'folder') {
      const overData = over?.data.current as
        | { type: 'folder-drop'; position: 'before' | 'after'; targetKey: string }
        | undefined;
      if (!overData || overData.type !== 'folder-drop') return;

      const sourceKey = dragData.key;
      const targetKey = overData.targetKey;
      if (sourceKey === targetKey) return;

      const sourceIdx = orderedGroupKeys.indexOf(sourceKey);
      const targetIdx = orderedGroupKeys.indexOf(targetKey);
      if (sourceIdx < 0 || targetIdx < 0) return;

      let insertIdx = overData.position === 'before' ? targetIdx : targetIdx + 1;
      if (sourceIdx < insertIdx) insertIdx -= 1;
      if (sourceIdx === insertIdx) return;

      const without = orderedGroupKeys.filter((k) => k !== sourceKey);
      const nextKeys = [...without.slice(0, insertIdx), sourceKey, ...without.slice(insertIdx)];

      const prevFolders = folders;
      const prevNoFolderPosition = noFolderPosition;
      const nextFolders = folders.map((f) => {
        const idx = nextKeys.indexOf(f.id);
        return idx >= 0 ? { ...f, position: idx } : f;
      });
      const nextNoFolderPosition = nextKeys.indexOf(NO_FOLDER_KEY);
      setFolders(nextFolders);
      setNoFolderPosition(nextNoFolderPosition);

      const ok = await persistGroupOrder(nextKeys);
      if (!ok) {
        setFolders(prevFolders);
        setNoFolderPosition(prevNoFolderPosition);
      } else {
        router.refresh();
      }
      return;
    }

    // Card drag end
    if (!over) return;
    const activeEventId = dragData.eventId;
    const activeEvent = events.find((e) => e.id === activeEventId);
    if (!activeEvent) return;

    const overData = over.data.current as
      | { type: 'card-drop'; position: 'before' | 'after'; targetEventId: string; folderKey: string }
      | { type: 'folder'; key: string }
      | { type: 'folder-empty'; folderKey: string }
      | undefined;
    if (!overData) return;

    const sourceFolderKey = activeEvent.folder_id ?? NO_FOLDER_KEY;
    let destFolderKey: string;
    let destIndex: number;

    if (overData.type === 'card-drop') {
      destFolderKey = overData.folderKey;
      const destList = grouped.get(destFolderKey) ?? [];
      const targetIdx = destList.findIndex((e) => e.id === overData.targetEventId);
      if (targetIdx < 0) return;
      let rawIdx = overData.position === 'before' ? targetIdx : targetIdx + 1;
      if (sourceFolderKey === destFolderKey) {
        const activeIdx = destList.findIndex((e) => e.id === activeEventId);
        if (activeIdx >= 0 && activeIdx < rawIdx) rawIdx -= 1;
        if (activeIdx === rawIdx) return;
      }
      destIndex = rawIdx;
    } else if (overData.type === 'folder' || overData.type === 'folder-empty') {
      destFolderKey = overData.type === 'folder' ? overData.key : overData.folderKey;
      const destList = grouped.get(destFolderKey) ?? [];
      destIndex = destList.filter((e) => e.id !== activeEventId).length;
      if (sourceFolderKey === destFolderKey) {
        const activeIdx = destList.findIndex((e) => e.id === activeEventId);
        if (activeIdx === destList.length - 1) return;
      }
    } else {
      return;
    }

    const destFolderId = destFolderKey === NO_FOLDER_KEY ? null : destFolderKey;
    const destListWithoutActive = (grouped.get(destFolderKey) ?? []).filter(
      (e) => e.id !== activeEventId,
    );
    const nextDestList = [
      ...destListWithoutActive.slice(0, destIndex),
      activeEvent,
      ...destListWithoutActive.slice(destIndex),
    ];

    const updates: { event_id: string; folder_id: string | null; position: number }[] = [];
    nextDestList.forEach((e, idx) => {
      updates.push({ event_id: e.id, folder_id: destFolderId, position: idx });
    });
    if (sourceFolderKey !== destFolderKey) {
      const sourceList = (grouped.get(sourceFolderKey) ?? []).filter(
        (e) => e.id !== activeEventId,
      );
      const sourceFolderId = sourceFolderKey === NO_FOLDER_KEY ? null : sourceFolderKey;
      sourceList.forEach((e, idx) => {
        updates.push({ event_id: e.id, folder_id: sourceFolderId, position: idx });
      });
    }

    if (updates.length === 0) return;

    const apply = (list: EventItem[]) =>
      list.map((e) => {
        const u = updates.find((x) => x.event_id === e.id);
        if (!u) return e;
        return { ...e, folder_id: u.folder_id, order_position: u.position };
      });
    setCreatedEvents(apply);
    setParticipatedEvents(apply);

    expand(destFolderKey);

    try {
      await foldersApi.reorderEvents(updates);
      router.refresh();
    } catch {
      // ignore
    }
  }

  const activeDragEvent = useMemo(() => {
    if (activeDrag?.type !== 'event') return null;
    return events.find((e) => e.id === activeDrag.eventId) ?? null;
  }, [activeDrag, events]);

  const activeDragFolder = useMemo(() => {
    if (activeDrag?.type !== 'folder') return null;
    if (activeDrag.key === NO_FOLDER_KEY) return null;
    return folders.find((f) => f.id === activeDrag.key) ?? null;
  }, [activeDrag, folders]);

  const cardDragActive = activeDrag?.type === 'event';

  const layoutTransition = { duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] };

  return (
    <div>
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
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDrag(null)}
          >
            <motion.div className="space-y-4">
              <AnimatePresence initial={false}>
                {orderedGroupKeys.map((key) => {
                  const folder = folders.find((f) => f.id === key);
                  const list = grouped.get(key) ?? [];
                  const isNoFolder = key === NO_FOLDER_KEY;
                  const isCollapsed = collapsed.has(key);
                  const isFolderBeingDragged = activeDrag?.type === 'folder' && activeDrag.key === key;
                  return (
                    <motion.div
                      key={key}
                      layout={!isFolderBeingDragged}
                      transition={layoutTransition}
                    >
                      <DraggableGroup groupKey={key}>
                        {({ dragHandle: folderDragHandle }) => (
                          <div>
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
                              dragHandle={folderDragHandle}
                            />
                            <AnimatePresence initial={false}>
                              {!isCollapsed && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                  animate={{
                                    height: 'auto',
                                    opacity: 1,
                                    transitionEnd: { overflow: 'visible' },
                                  }}
                                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                >
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 pl-1 pb-1">
                                    {list.length === 0 ? (
                                      <EmptyFolderDrop
                                        folderKey={key}
                                        cardDragActive={cardDragActive}
                                      />
                                    ) : (
                                      <AnimatePresence initial={false}>
                                        {list.map((event) => {
                                          const isCardBeingDragged =
                                            activeDrag?.type === 'event' &&
                                            activeDrag.eventId === event.id;
                                          return (
                                            <motion.div
                                              key={event.id}
                                              layout={!isCardBeingDragged}
                                              transition={layoutTransition}
                                            >
                                              <DraggableCard
                                                eventId={event.id}
                                                folderKey={key}
                                              >
                                                {({ dragHandle, isDragging }) => (
                                                  <EventCard
                                                    id={event.id}
                                                    title={event.title}
                                                    dateCount={event.dates.length}
                                                    participantCount={event.participant_count}
                                                    createdAt={event.created_at}
                                                    canDelete={event.is_owner}
                                                    isOwner={event.is_owner}
                                                    isDragging={isDragging}
                                                    dragHandle={dragHandle}
                                                    onRequestDelete={(id) => setDeleteTargetId(id)}
                                                    onRequestMove={() => {
                                                      setMoveError('');
                                                      setMoveTarget(event);
                                                    }}
                                                  />
                                                )}
                                              </DraggableCard>
                                            </motion.div>
                                          );
                                        })}
                                      </AnimatePresence>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </DraggableGroup>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            <DragOverlay dropAnimation={null}>
              {activeDragEvent && (
                <div className="opacity-90 rotate-1 cursor-grabbing">
                  <EventCard
                    id={activeDragEvent.id}
                    title={activeDragEvent.title}
                    dateCount={activeDragEvent.dates.length}
                    participantCount={activeDragEvent.participant_count}
                    createdAt={activeDragEvent.created_at}
                    canDelete={false}
                    isOwner={activeDragEvent.is_owner}
                  />
                </div>
              )}
              {activeDrag?.type === 'folder' && (
                <div className="opacity-80 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-md flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    {activeDragFolder?.name ?? '폴더 없음'}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

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
