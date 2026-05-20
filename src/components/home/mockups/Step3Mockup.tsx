// 6 columns (날짜) x 7 rows (시간) — color levels match the actual heatmap.
// 0=none, 1=light teal, 2=teal, 3=deep teal.
const GRID: number[][] = [
  [0, 1, 1, 0, 0, 0],
  [1, 2, 2, 1, 0, 0],
  [1, 2, 3, 2, 1, 0],
  [2, 3, 3, 2, 2, 1],
  [1, 2, 3, 3, 2, 1],
  [0, 1, 2, 2, 1, 1],
  [0, 0, 1, 1, 0, 0],
];

const LEVEL_CLASS = [
  'bg-gray-100',
  'bg-teal-100',
  'bg-teal-400',
  'bg-teal-700',
];

const HOURS = ['10', '11', '12', '13', '14', '15', '16'];

export default function Step3Mockup() {
  return (
    <div className="w-full max-w-65 bg-white rounded-xl shadow-md border border-gray-200/60 p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] font-bold text-gray-700">
          가능한 시간
        </div>
        <div className="text-[9px] text-gray-400">5명 응답</div>
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-0.5">
          {HOURS.map((h) => (
            <div
              key={h}
              className="h-3.5 text-[7px] text-gray-400 flex items-center justify-end pr-0.5 font-mono leading-none"
              style={{ width: 14 }}
            >
              {h}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-6 gap-0.5">
          {GRID.flat().map((level, i) => (
            <div
              key={i}
              className={`h-3.5 rounded-sm ${LEVEL_CLASS[level]}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-[8px] text-gray-400">
        <span>적음</span>
        <span className="flex gap-0.5">
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={`w-2 h-2 rounded-sm ${c}`} />
          ))}
        </span>
        <span>많음</span>
      </div>
    </div>
  );
}
