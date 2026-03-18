'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ChevronDown, Filter } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { createClient } from '@/lib/supabase/client'
import type { Log, User } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'

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

const DEFAULT_PAGE_SIZE = 15

export default function ErrorLogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LogWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedLog, setSelectedLog] = useState<LogWithUser | null>(null)
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filter state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all')

  // Load logs with filters
  const loadLogs = async (page: number, size: number) => {
    setLoading(true)

    try {
      // Helper to build the base query with filters
      const buildFilteredQuery = () => {
        let query = (supabase.from('logs') as any).select('*, users(email, first_name, last_name)')

        // Apply date filters
        if (dateFrom) {
          const startISO = new Date(dateFrom).toISOString()
          query = query.gte('created_at', startISO)
        }
        if (dateTo) {
          // Add 1 day to include all of the selected date
          const endDate = new Date(dateTo)
          endDate.setDate(endDate.getDate() + 1)
          const endISO = endDate.toISOString()
          query = query.lt('created_at', endISO)
        }

        // Apply level filter
        if (selectedLevel !== 'all') {
          query = query.eq('level', selectedLevel)
        }

        return query
      }

      // Run count query and data query in parallel
      const [countResult, dataResult] = await Promise.all([
        buildFilteredQuery().select('*', { count: 'exact', head: true }),
        buildFilteredQuery()
          .order('created_at', { ascending: false })
          .range((page - 1) * size, page * size - 1),
      ])

      if (countResult.error) {
        console.error('[Logs] Failed to count logs:', countResult.error)
        toast.error('Failed to load logs', { description: getUserFriendlyMessage(countResult.error) })
        return
      }

      if (dataResult.error) {
        console.error('[Logs] Failed to load logs:', dataResult.error)
        toast.error('Failed to load logs', { description: getUserFriendlyMessage(dataResult.error) })
        return
      }

      setTotalCount(countResult.count || 0)
      setLogs(dataResult.data || [])
    } catch (err) {
      console.error('[Logs] Unexpected error:', err)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Load logs when page, pageSize, or filters change
  useEffect(() => {
    loadLogs(currentPage, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, dateFrom, dateTo, selectedLevel])

  // Filter handler wrappers that reset to page 1
  const handleDateFromChange = (value: string) => {
    setCurrentPage(1)
    setDateFrom(value)
  }

  const handleDateToChange = (value: string) => {
    setCurrentPage(1)
    setDateTo(value)
  }

  const handleLevelChange = (value: 'all' | 'info' | 'warn' | 'error') => {
    setCurrentPage(1)
    setSelectedLevel(value)
  }

  const handleResetFilters = () => {
    setCurrentPage(1)
    setDateFrom('')
    setDateTo('')
    setSelectedLevel('all')
  }

  const activeFilterCount = [dateFrom !== '', dateTo !== '', selectedLevel !== 'all'].filter(Boolean).length

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

  const levelOptions: Array<{ value: 'all' | 'info' | 'warn' | 'error'; label: string }> = [
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

  if (loading && logs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Error Logs</h1>
        </div>

        {/* Skeleton Loading */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Logs</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Error Logs</h1>
                <Badge variant="outline" className="text-xs">
                  {totalCount}
                </Badge>
              </div>
              <p className="text-muted-foreground">Monitor application errors and system events</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border border-border rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              Filters
              {!filtersOpen && activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">{activeFilterCount}</Badge>
              )}
            </span>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${
                filtersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Filter Grid — conditionally shown */}
          {filtersOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                {/* Date From */}
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Level Filter */}
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <select
                    id="level"
                    value={selectedLevel}
                    onChange={(e) => handleLevelChange(e.target.value as 'all' | 'info' | 'warn' | 'error')}
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
            </div>
          )}
        </motion.div>

        {/* Logs Table */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border border-border rounded-lg overflow-hidden">
          {logs.length === 0 ? (
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
                {logs.map((log) => (
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
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
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
