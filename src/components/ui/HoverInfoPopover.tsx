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
  /** Vertical offset above the anchor in pixels. Default 8. */
  offset?: number;
  /** Maximum width of the popover. Default 240. */
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
  offset = 8,
  maxWidth = 240,
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
            left: clampHorizontal(position.x + position.width / 2, maxWidth),
            top: position.y - offset,
            transform: 'translate(-50%, -100%)',
            maxWidth,
          }}
        >
          <div className="rounded-lg bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs shadow-lg backdrop-blur-sm px-3 py-2 leading-relaxed">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function clampHorizontal(centerX: number, popoverWidth: number): number {
  if (typeof window === 'undefined') return centerX;
  const half = popoverWidth / 2;
  const min = half + 8;
  const max = window.innerWidth - half - 8;
  return Math.max(min, Math.min(max, centerX));
}
