'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';

export interface IfNeededLegendHandle {
  setVisible: (visible: boolean) => void;
}

/**
 * 호버/탭한 슬롯에 if-needed 응답이 있을 때만 표시되는 범례.
 * 부모 re-render 없이 imperative handle로 보임/숨김 제어.
 */
const IfNeededLegend = forwardRef<IfNeededLegendHandle>(function IfNeededLegend(_props, ref) {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({ setVisible }), []);

  if (!visible) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <p className="text-xs text-gray-400 px-2">
        <span className="inline-block w-3.5 h-3.5 rounded-[3px] bg-[#FFE8B8] align-middle mr-1.5" />
        if needed
      </p>
    </div>
  );
});

export default IfNeededLegend;
