'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface HoverInfoPosition {
  /** viewport x of the anchor element's left */
  x: number;
  /** viewport y of the anchor element's top */
  y: number;
  /** anchor element width */
  width: number;
  /** anchor element height */
  height: number;
}

interface HoverInfoPopoverProps {
  /** When null, popover is hidden */
  position: HoverInfoPosition | null;
  children: React.ReactNode;
  /** Gap from the anchor in pixels. Default 14. */
  offset?: number;
  /** Maximum width of the popover. Default 160. */
  maxWidth?: number;
}

/**
 * 호버 시 표시되는 정보 popover.
 * - 앵커 요소 위에 표시 (공간 부족하면 아래)
 * - body Portal 렌더로 레이아웃 시프트 없음
 * - pointer-events: none — 마우스 이벤트가 cell로 전달됨
 */
export default function HoverInfoPopover({
  position,
  children,
  offset = 10,
  maxWidth = 160,
}: HoverInfoPopoverProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {position && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[200] pointer-events-none"
          style={{
            ...getPopoverPosition(position, maxWidth, offset),
            maxWidth,
          }}
        >
          <div className="rounded-md border border-emerald-200/80 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 text-xs shadow-md backdrop-blur-md px-2 py-1 leading-relaxed">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function getPopoverPosition(
  position: HoverInfoPosition,
  popoverWidth: number,
  offset: number,
): { left: number; top: number; transform: string } {
  const fallback = {
    left: position.x + position.width + offset,
    top: position.y + position.height / 2,
    transform: 'translateY(-50%)',
  };

  if (typeof window === 'undefined') return fallback;

  const margin = 8;
  const preferredLeft = position.x + position.width + offset;
  const hasRoomOnRight = preferredLeft + popoverWidth + margin <= window.innerWidth;
  const left = hasRoomOnRight
    ? preferredLeft
    : Math.max(margin, position.x - popoverWidth - offset);

  return {
    left,
    top: Math.max(margin, Math.min(window.innerHeight - margin, fallback.top)),
    transform: 'translateY(-50%)',
  };
}
