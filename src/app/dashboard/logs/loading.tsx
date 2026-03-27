export default function LogsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
        ))}
      </div>
    </div>
  )
}
