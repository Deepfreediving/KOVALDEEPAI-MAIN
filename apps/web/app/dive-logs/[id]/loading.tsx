export default function DiveLogLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="h-8 w-64 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-16 bg-blue-300 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Performance Summary Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="h-6 w-40 bg-gray-300 rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
