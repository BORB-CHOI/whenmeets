'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import DragGrid from '@/components/drag-grid/DragGrid';
import HeatmapLegend from '@/components/results/HeatmapLegend';
import type { DemoFixture } from '@/lib/demo-data';
import type { Availability, AvailabilityLevel } from '@/lib/types';
import { cn } from '@/lib/cn';

const HeatmapGrid = dynamic(() => import('@/components/results/HeatmapGrid'), {
  ssr: false,
  loading: () => (
    <div className="h-120 flex items-center justify-center text-sm text-gray-400">
      결과 히트맵을 불러오는 중...
    </div>
  ),
});

const CalendarHeatmapGrid = dynamic(() => import('@/components/results/CalendarHeatmapGrid'), {
  ssr: false,
  loading: () => (
    <div className="h-120 flex items-center justify-center text-sm text-gray-400">
      결과 히트맵을 불러오는 중...
    </div>
  ),
});

type ViewMode = 'view' | 'edit';

interface DemoEventViewerProps {
  fixture: DemoFixture;
  enableEdit?: boolean;
}

export default function DemoEventViewer({ fixture, enableEdit = true }: DemoEventViewerProps) {
  const [mode, setMode] = useState<ViewMode>('view');
  const [myAvailability, setMyAvailability] = useState<Availability>({});
  const [activeMode, setActiveMode] = useState<AvailabilityLevel>(2);

  const selectedIds = useMemo(
    () => new Set(fixture.participants.map((p) => p.id)),
    [fixture.participants],
  );

  const hasInput = Object.keys(myAvailability).length > 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />
            응답자 {fixture.participants.length}명
          </span>
          <span className="text-gray-300">,</span>
          <span>{fixture.dateOnly ? `${fixture.dates.length}개 후보 날짜` : `${fixture.dates.length}일 × 시간대`}</span>
        </div>

        {enableEdit && (
          <div className="inline-flex rounded-md border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('view')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                mode === 'view' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              결과 히트맵
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border-l border-gray-200',
                mode === 'edit' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              내 시간 입력해보기
            </button>
          </div>
        )}
      </div>

      <div className="relative rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {mode === 'view' ? (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {fixture.dateOnly ? (
                <CalendarHeatmapGrid
                  dates={fixture.dates}
                  participants={fixture.participants}
                  selectedIds={selectedIds}
                  includeIfNeeded
                  eventMode={fixture.mode}
                />
              ) : (
                <HeatmapGrid
                  dates={fixture.dates}
                  timeStart={fixture.timeStart}
                  timeEnd={fixture.timeEnd}
                  participants={fixture.participants}
                  selectedIds={selectedIds}
                  includeIfNeeded
                  eventMode={fixture.mode}
                />
              )}
              <div className="mt-3 flex justify-start">
                <HeatmapLegend total={fixture.participants.length} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-3 py-2.5 px-3 rounded-md text-center text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                {fixture.dateOnly ? '✅ 되는 날짜를 드래그하세요. 저장되지 않는 체험 모드입니다' : '✅ 되는 시간을 드래그하세요. 저장되지 않는 체험 모드입니다'}
              </div>
              <DragGrid
                dates={fixture.dates}
                timeStart={fixture.timeStart}
                timeEnd={fixture.timeEnd}
                availability={myAvailability}
                onAvailabilityChange={setMyAvailability}
                participants={fixture.participants}
                currentParticipantId="demo-current"
                dateOnly={fixture.dateOnly}
                eventMode={fixture.mode}
                activeMode={activeMode}
                onActiveModeChange={setActiveMode}
              />
              {hasInput && (
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                  <span>입력값은 새로고침 시 사라집니다. 실제 이벤트를 만들면 자동 저장됩니다.</span>
                  <button
                    type="button"
                    onClick={() => setMyAvailability({})}
                    className="font-medium text-teal-600 hover:underline cursor-pointer"
                  >
                    초기화
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
