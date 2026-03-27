import { TableSkeleton } from '@/components/ui/table-skeleton'

const skeletonColumns = [
  { header: 'Player', isPrimary: true, skeletonWidth: 'w-32' },
  { header: 'Status', skeletonWidth: 'w-20' },
  { header: 'Amount', skeletonWidth: 'w-20' },
  { header: 'Reference', className: 'hidden sm:table-cell', skeletonWidth: 'w-24' },
  { header: 'Confidence', className: 'hidden md:table-cell', skeletonWidth: 'w-20' },
  { header: 'Actions', className: 'text-right', isAction: true, skeletonWidth: 'w-32' },
]

export default function PaymentsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse" />
      </div>
      {/* Schedule selector skeleton */}
      <div className="mb-8">
        <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="bg-card border-border border rounded-lg overflow-hidden">
        <TableSkeleton columns={skeletonColumns} rows={5} />
      </div>
    </div>
  )
}
