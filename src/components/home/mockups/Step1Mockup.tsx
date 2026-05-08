export default function Step1Mockup() {
  return (
    <div className="w-full max-w-65 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200/60 dark:border-gray-700/60 p-3.5">
      <div className="text-[11px] font-bold text-gray-700 dark:text-gray-200 mb-2.5">
        새 이벤트
      </div>

      <div className="mb-2.5">
        <div className="text-[9px] font-medium text-gray-400 mb-1">제목</div>
        <div className="h-7 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 flex items-center px-2 text-[11px] text-gray-700 dark:text-gray-200 font-medium">
          팀 회의
        </div>
      </div>

      <div className="mb-2.5">
        <div className="text-[9px] font-medium text-gray-400 mb-1">날짜</div>
        <div className="grid grid-cols-7 gap-0.5">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <div
              key={d}
              className="text-[8px] text-gray-400 text-center font-medium"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: 14 }).map((_, i) => {
            const isSelected = [3, 4, 8, 11].includes(i);
            return (
              <div
                key={i}
                className={`aspect-square rounded text-[8px] flex items-center justify-center ${
                  isSelected
                    ? 'bg-teal-600 text-white font-bold shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-700/40 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-7 rounded-md bg-teal-600 text-white text-[10px] font-semibold flex items-center justify-center shadow-sm">
        만들기
      </div>
    </div>
  );
}
