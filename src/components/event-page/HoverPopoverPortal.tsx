'use client';

import { forwardRef, useImperativeHandle, useState, useCallback, type ReactNode } from 'react';
import HoverInfoPopover, { type HoverInfoPosition } from '@/components/ui/HoverInfoPopover';

export interface HoverPopoverState {
  date: string;
  slot: number;
  position: HoverInfoPosition;
}

export interface HoverPopoverHandle {
  update: (next: HoverPopoverState | null) => void;
}

interface HoverPopoverPortalProps {
  renderContent: (date: string, slot: number) => ReactNode;
}

const HoverPopoverPortal = forwardRef<HoverPopoverHandle, HoverPopoverPortalProps>(function HoverPopoverPortal(
  { renderContent },
  ref,
) {
  const [state, setState] = useState<HoverPopoverState | null>(null);

  const update = useCallback((next: HoverPopoverState | null) => {
    setState(next);
  }, []);

  useImperativeHandle(ref, () => ({ update }), [update]);

  return (
    <HoverInfoPopover position={state?.position ?? null}>
      {state ? renderContent(state.date, state.slot) : null}
    </HoverInfoPopover>
  );
});

export default HoverPopoverPortal;
