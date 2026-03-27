export default function LineupLoading() {
  return (
    <div className="w-full h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-4" />
          <div className="flex items-center justify-end gap-2">
            <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 p-4 h-full overflow-hidden">
        {/* Unassigned pool skeleton */}
        <div className="w-64 flex-shrink-0 border border-border rounded-lg p-4 bg-card">
          <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Team columns skeleton */}
        <div className="flex-1 flex gap-4 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-80 border border-border rounded-lg p-4 bg-card">
              <div className="h-8 w-24 bg-muted rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
