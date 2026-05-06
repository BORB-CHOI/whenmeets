export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="mt-2 h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
