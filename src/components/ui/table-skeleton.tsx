import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface SkeletonColumn {
  header: string
  className?: string
  skeletonWidth?: string
  isPrimary?: boolean
  isAction?: boolean
}

interface TableSkeletonProps {
  columns: SkeletonColumn[]
  rows?: number
}

export function TableSkeleton({ columns, rows = 3 }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          {columns.map((col, i) => (
            <TableHead key={i} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRow key={rowIdx} className="border-border">
            {columns.map((col, colIdx) => (
              <TableCell
                key={colIdx}
                className={[col.isPrimary ? 'py-4' : '', col.className ?? ''].filter(Boolean).join(' ')}
              >
                {col.isPrimary ? (
                  <div className="space-y-1">
                    <div className={`h-4 bg-muted rounded ${col.skeletonWidth ?? 'w-32'} animate-pulse`} />
                    <div className="h-3 bg-muted/50 rounded w-24 animate-pulse" />
                  </div>
                ) : col.isAction ? (
                  <div className={`h-8 bg-muted rounded ${col.skeletonWidth ?? 'w-24'} ml-auto animate-pulse`} />
                ) : (
                  <div className={`h-4 bg-muted rounded ${col.skeletonWidth ?? 'w-24'} animate-pulse`} />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
