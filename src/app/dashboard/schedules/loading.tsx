import { TableSkeleton } from '@/components/ui/table-skeleton'

export default function SchedulesLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse" />
      </div>
      <div className="bg-card border-border border rounded-lg overflow-hidden">
        <TableSkeleton
          columns={[
            { header: 'Schedule', isPrimary: true, skeletonWidth: 'w-40' },
            { header: 'Skill Level', className: 'hidden md:table-cell', skeletonWidth: 'w-28' },
            { header: 'Status', skeletonWidth: 'w-24' },
            { header: 'Teams', className: 'hidden sm:table-cell', skeletonWidth: 'w-8' },
            { header: 'Actions', className: 'text-right', isAction: true, skeletonWidth: 'w-20' },
          ]}
          rows={3}
        />
      </div>
    </div>
  )
}
