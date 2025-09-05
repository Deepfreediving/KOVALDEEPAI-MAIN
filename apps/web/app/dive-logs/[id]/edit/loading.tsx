export default function EditDiveLogLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-300 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Form Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <div className="h-6 w-40 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Performance Section */}
            <div>
              <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notes Section */}
            <div>
              <div className="h-6 w-20 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="h-32 bg-gray-300 rounded animate-pulse"></div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <div className="h-10 w-20 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-10 w-24 bg-blue-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
