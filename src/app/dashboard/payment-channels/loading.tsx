import { TableSkeleton } from '@/components/ui/table-skeleton'

const skeletonColumns = [
  { header: 'Channel', isPrimary: true, skeletonWidth: 'w-32' },
  { header: 'Provider', skeletonWidth: 'w-20' },
  { header: 'Account', skeletonWidth: 'w-28' },
  { header: 'QR Code', className: 'hidden sm:table-cell', skeletonWidth: 'w-16' },
  { header: 'Status', skeletonWidth: 'w-16' },
  { header: 'Actions', className: 'text-right', isAction: true, skeletonWidth: 'w-24' },
]

export default function PaymentChannelsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <div className="bg-card border-border border rounded-lg overflow-hidden">
        <TableSkeleton columns={skeletonColumns} rows={3} />
      </div>
    </div>
  )
}
