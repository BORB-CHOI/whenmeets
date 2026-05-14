'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface FolderOption {
  id: string;
  name: string;
}

interface MoveToFolderModalProps {
  open: boolean;
  folders: FolderOption[];
  currentFolderId: string | null;
  submitting: boolean;
  error: string;
  eventTitle: string;
  onSubmit: (folderId: string | null) => void;
  onClose: () => void;
}

export default function MoveToFolderModal({
  open,
  folders,
  currentFolderId,
  submitting,
  error,
  eventTitle,
  onSubmit,
  onClose,
}: MoveToFolderModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget)
              (e.currentTarget as HTMLElement).dataset.bd = '1';
          }}
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              (e.currentTarget as HTMLElement).dataset.bd === '1'
            )
              onClose();
            (e.currentTarget as HTMLElement).dataset.bd = '';
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-2 shrink-0">
              <h2 className="text-base font-bold text-gray-900">폴더로 이동</h2>
              <p className="mt-1 text-xs text-gray-500 truncate">{eventTitle}</p>
            </div>
            <div className="px-2 py-1 overflow-y-auto custom-scrollbar">
              <FolderRow
                label="폴더 없음"
                selected={currentFolderId === null}
                disabled={submitting}
                onClick={() => onSubmit(null)}
              />
              {folders.map((f) => (
                <FolderRow
                  key={f.id}
                  label={f.name}
                  selected={currentFolderId === f.id}
                  disabled={submitting}
                  onClick={() => onSubmit(f.id)}
                />
              ))}
              {folders.length === 0 && (
                <p className="px-3 py-3 text-xs text-gray-400">
                  아직 폴더가 없습니다. 대시보드에서 새 폴더를 만들어 보세요.
                </p>
              )}
            </div>
            {error && (
              <p className="px-5 py-2 text-xs text-red-500 shrink-0">{error}</p>
            )}
            <div className="flex justify-end gap-2 px-5 pb-4 pt-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FolderRow({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
        selected
          ? 'bg-teal-50 text-teal-700 font-semibold'
          : 'text-gray-700 hover:bg-gray-50'
      } disabled:opacity-50`}
    >
      <span className="flex items-center gap-2 truncate">
        <svg className="w-4 h-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate">{label}</span>
      </span>
      {selected && (
        <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </button>
  );
}
