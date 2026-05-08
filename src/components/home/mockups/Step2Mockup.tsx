export default function Step2Mockup() {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[260px]">
      <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200/60 dark:border-gray-700/60 p-3.5">
        <div className="text-[10px] font-bold text-gray-700 dark:text-gray-200 mb-2">
          공유 링크
        </div>
        <div className="h-8 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 flex items-center justify-between px-2.5">
          <span className="text-[10px] text-gray-700 dark:text-gray-200 font-mono truncate">
            whenmeets.com/e/aBc123
          </span>
          <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 ml-2 shrink-0">
            복사
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-yellow-300 flex items-center justify-center text-[10px] shadow-sm">
          💬
        </span>
        <span className="w-7 h-7 rounded-full bg-purple-400 flex items-center justify-center text-[10px] shadow-sm">
          📩
        </span>
        <span className="w-7 h-7 rounded-full bg-green-400 flex items-center justify-center text-[10px] shadow-sm">
          📤
        </span>
        <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-500 shadow-sm">
          ···
        </span>
      </div>
    </div>
  );
}
