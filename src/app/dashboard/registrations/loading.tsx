import { TableSkeleton } from '@/components/ui/table-skeleton'

export default function RegistrationsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse" />
      </div>
      {/* Schedule grid skeleton */}
      <div className="mb-8">
        <div className="h-6 w-20 bg-muted rounded animate-pulse mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="bg-card border-border border rounded-lg overflow-hidden">
        <TableSkeleton
          columns={[
            { header: 'Player', isPrimary: true, skeletonWidth: 'w-40' },
            { header: 'Position', className: 'hidden sm:table-cell', skeletonWidth: 'w-24' },
            { header: 'Team', className: 'hidden md:table-cell', skeletonWidth: 'w-20' },
            { header: 'Payment', skeletonWidth: 'w-16' },
            { header: 'Registered', className: 'hidden md:table-cell', skeletonWidth: 'w-24' },
          ]}
          rows={5}
        />
      </div>
    </div>
  )
}
