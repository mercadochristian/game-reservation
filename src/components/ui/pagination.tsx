'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const isPrevDisabled = currentPage === 1
  const isNextDisabled = currentPage === totalPages || totalPages === 0

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Count text */}
      <p className="text-sm text-muted-foreground">
        {totalCount === 0 ? 'No results' : `Showing ${startItem}–${endItem} of ${totalCount} results`}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isPrevDisabled}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} className="mr-1" />
          Prev
        </Button>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isNextDisabled}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={16} className="ml-1" />
        </Button>

        {/* Page size selector */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="flex h-8 w-auto rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} rows
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
