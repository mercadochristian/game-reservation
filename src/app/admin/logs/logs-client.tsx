'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { FilterAccordion } from '@/components/filter-accordion'
import type { Log, User } from '@/types'
import { fadeUpVariants } from '@/lib/animations'

interface LogWithUser extends Log {
  users?: Pick<User, 'email' | 'first_name' | 'last_name'> | null
}

const LEVEL_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'outline',
  warn: 'secondary',
  error: 'destructive',
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-600 dark:text-blue-400',
  warn: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
}

interface LogsClientProps {
  logs: LogWithUser[]
  totalCount: number
  currentPage: number
  pageSize: number
  filters: {
    dateFrom: string
    dateTo: string
    level: string
  }
}

export function LogsClient({
  logs,
  totalCount,
  currentPage,
  pageSize,
  filters,
}: LogsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedLog, setSelectedLog] = useState<LogWithUser | null>(null)
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const handleFilterChange = (updates: Partial<{ dateFrom: string; dateTo: string; level: string; page: number; pageSize: number }>) => {
    const params = new URLSearchParams()
    const merged = {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      level: filters.level,
      page: 1,
      pageSize,
      ...updates,
    }
    if (merged.dateFrom) params.set('dateFrom', merged.dateFrom)
    if (merged.dateTo) params.set('dateTo', merged.dateTo)
    if (merged.level && merged.level !== 'all') params.set('level', merged.level)
    if (merged.page > 1) params.set('page', String(merged.page))
    if (merged.pageSize !== 15) params.set('pageSize', String(merged.pageSize))
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleResetFilters = () => {
    router.push(pathname)
  }

  const activeFilterCount = [
    filters.dateFrom !== '',
    filters.dateTo !== '',
    filters.level !== 'all' && filters.level !== '',
  ].filter(Boolean).length

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const levelOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warn' },
    { value: 'error', label: 'Error' },
  ]

  const getUserDisplay = (log: LogWithUser) => {
    if (!log.users) return '—'
    const { first_name, last_name, email } = log.users
    const fullName = [first_name, last_name].filter(Boolean).join(' ')
    return fullName || email || '—'
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Logs"
          title="Error Logs"
          count={totalCount}
          description="Monitor application errors and system events"
        />

        {/* Filters */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants}>
          <FilterAccordion
            open={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            label="Filters"
            activeFilterCount={activeFilterCount}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Level Filter */}
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <select
                  id="level"
                  value={filters.level || 'all'}
                  onChange={(e) => handleFilterChange({ level: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </div>
          </FilterAccordion>
        </motion.div>

        {/* Logs Table */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border border-border rounded-lg overflow-hidden">
          {(logs ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No logs found</h3>
              <p className="text-sm text-muted-foreground">No logs match your selected filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-32">Timestamp</TableHead>
                  <TableHead className="w-16">Level</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-20 text-right">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs ?? []).map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={LEVEL_BADGE_VARIANTS[log.level]} className={LEVEL_COLORS[log.level]}>
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{log.action}</TableCell>
                    <TableCell className="text-sm max-w-sm truncate">{log.message || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getUserDisplay(log)}</TableCell>
                    <TableCell className="text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setSelectedLog(log)
                            setMetadataDialogOpen(true)
                          }}
                          title="View metadata"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Pagination */}
        {totalCount > 0 && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => handleFilterChange({ page, pageSize })}
              onPageSizeChange={(size) => handleFilterChange({ page: 1, pageSize: size })}
            />
          </motion.div>
        )}
      </div>

      {/* Metadata Dialog */}
      <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong className="text-foreground">Action:</strong>{' '}
                  <span className="font-mono text-muted-foreground">{selectedLog.action}</span>
                </p>
                <p>
                  <strong className="text-foreground">Level:</strong>{' '}
                  <Badge variant={LEVEL_BADGE_VARIANTS[selectedLog.level]} className={LEVEL_COLORS[selectedLog.level]}>
                    {selectedLog.level}
                  </Badge>
                </p>
                <p>
                  <strong className="text-foreground">Timestamp:</strong>{' '}
                  <span className="text-muted-foreground">{formatDate(selectedLog.created_at)}</span>
                </p>
                <p>
                  <strong className="text-foreground">User:</strong>{' '}
                  <span className="text-muted-foreground">{getUserDisplay(selectedLog)}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
