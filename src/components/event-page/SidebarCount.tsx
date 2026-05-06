'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface SidebarCountProps {
  selectedCount: number;
  totalCount: number;
  label?: string;
}

export interface SidebarCountHandle {
  /** Imperatively swap the (N/M) display while a heatmap cell is being hovered.
   *  Pass `null` to restore the default `selectedCount` value. */
  updateForSlot: (slotCount: number | null) => void;
}

const SidebarCount = forwardRef<SidebarCountHandle, SidebarCountProps>(function SidebarCount(
  { selectedCount, totalCount, label = '응답자' },
  ref,
) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const slotCountRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    updateForSlot(slotCount) {
      slotCountRef.current = slotCount;
      if (!spanRef.current) return;
      const n = slotCount ?? selectedCount;
      spanRef.current.textContent = `(${n}/${totalCount})`;
    },
  }), [selectedCount, totalCount]);

  // Re-sync display whenever the underlying counts change AND no hover is active.
  useEffect(() => {
    if (slotCountRef.current === null && spanRef.current) {
      spanRef.current.textContent = `(${selectedCount}/${totalCount})`;
    }
  }, [selectedCount, totalCount]);

  return (
    <>
      {label}{' '}
      <span ref={spanRef} className="tabular-nums">
        ({selectedCount}/{totalCount})
      </span>
    </>
  );
});

export default SidebarCount;
