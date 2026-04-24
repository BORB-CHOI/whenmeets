'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

interface InlineDeleteButtonProps {
  onConfirm: () => void;
  /** 휴지통 아이콘 버튼의 tooltip */
  title?: string;
  /** 휴지통 아이콘 버튼의 추가 className (예: opacity-0 group-hover:opacity-100) */
  className?: string;
  /** 확인 버튼 라벨 */
  confirmLabel?: string;
  /** 취소 버튼 라벨 */
  cancelLabel?: string;
}

/**
 * 인라인 삭제 버튼 — 휴지통 아이콘 클릭 시 [삭제][취소] 확인 UI로 전환.
 *
 * 사용 시 부모 컨테이너에 `group` 클래스를 추가해야 hover 표시가 작동.
 */
export default function InlineDeleteButton({
  onConfirm,
  title = '삭제',
  className,
  confirmLabel = '삭제',
  cancelLabel = '취소',
}: InlineDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConfirm();
          }}
          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
          className="px-2 py-1 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
      title={title}
      className={cn(
        'p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer',
        className,
      )}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
    </button>
  );
}
