'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface EventActionsProps {
  editing: boolean;
  busy: boolean;
  saveFailed: boolean;
  copied: boolean;
  onEdit: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onCopy: () => void;
  className?: string;
}

const buttonBase = 'flex h-11 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60 disabled:cursor-not-allowed';

const EventActions = forwardRef<HTMLDivElement, EventActionsProps>(function EventActions({
  editing, busy, saveFailed, copied, onEdit, onFinish, onCancel, onCopy, className,
}, ref) {
  return (
    <div ref={ref} className={cn('grid gap-2 lg:grid-cols-1', editing ? 'grid-cols-3' : 'grid-cols-2', className)}>
      <button type="button" onClick={editing ? onFinish : onEdit} disabled={busy}
        className={cn(buttonBase, 'border-teal-600 bg-teal-600 text-white shadow-[var(--shadow-primary)] hover:border-teal-700 hover:bg-teal-700')}>
        {busy ? editing ? '저장 중...' : '불러오는 중...' : editing ? saveFailed ? '다시 저장' : '편집 완료' : '편집'}
      </button>
      {editing && (
        <button type="button" onClick={onCancel} disabled={busy}
          className={cn(buttonBase, 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100')}>
          취소
        </button>
      )}
      <button type="button" onClick={onCopy}
        className={cn(buttonBase, 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50')}>
        {copied ? '복사됨!' : '링크 복사'}
      </button>
    </div>
  );
});

export default EventActions;
