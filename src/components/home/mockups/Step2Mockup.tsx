export default function Step2Mockup() {
  return (
    <div className="w-full max-w-65 flex flex-col items-center gap-3">
      {/* Event header card — matches the actual /e/[id] header layout. */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
              팀 회의
            </div>
            <div className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">
              4명 응답
            </div>
          </div>
          <div className="h-6 px-2 inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-[9px] font-medium text-teal-600 dark:text-teal-400 shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            복사됨!
          </div>
        </div>

        {/* Body skeleton — suggests the rest of the page is there */}
        <div className="p-3 space-y-1.5">
          <div className="h-1.5 rounded bg-gray-100 dark:bg-gray-700/50 w-3/5" />
          <div className="grid grid-cols-5 gap-0.5 mt-1.5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-sm ${
                  [3, 6, 7, 8, 11, 12].includes(i)
                    ? 'bg-teal-300 dark:bg-teal-600/60'
                    : 'bg-gray-100 dark:bg-gray-700/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating success toast — matches the actual app toast (gray-900 bg, white text, rounded-lg) */}
      <div className="bg-gray-900 text-white text-[10px] font-medium rounded-lg px-3 py-1.5 shadow-lg">
        링크가 복사되었습니다
      </div>
    </div>
  );
}
