export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="h-10 w-64 bg-muted rounded animate-pulse mb-4" />
      <div className="h-5 w-96 bg-muted rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
