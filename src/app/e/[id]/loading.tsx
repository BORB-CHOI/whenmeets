export default function EventLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="mb-6">
        <div className="h-7 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="mt-2 h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="h-12 mb-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-96 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
