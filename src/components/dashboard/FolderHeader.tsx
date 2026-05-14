'use client';

import { useState, useRef, useEffect } from 'react';

interface FolderHeaderProps {
  name: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Undefined for the implicit "폴더 없음" group. */
  onRename?: () => void;
  onDelete?: () => void;
}

export default function FolderHeader({
  name,
  count,
  collapsed,
  onToggle,
  onRename,
  onDelete,
}: FolderHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const hasActions = onRename || onDelete;

  return (
    <div className="flex items-center justify-between gap-2 group">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer py-1.5 -ml-1 px-1 rounded hover:bg-gray-50 transition-colors"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${
            collapsed ? '-rotate-90' : 'rotate-0'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        <span className="text-sm font-semibold text-gray-700 truncate">{name}</span>
        <span className="text-xs text-gray-400 tabular-nums">{count}</span>
      </button>

      {hasActions && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="폴더 옵션"
            className="p-1.5 text-gray-400 rounded-md transition-all duration-150 ease-out cursor-pointer hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[open=true]:opacity-100"
            data-open={menuOpen}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-32 rounded-md border border-gray-200 bg-white shadow-lg py-1">
              {onRename && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRename();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  이름 변경
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  폴더 삭제
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
