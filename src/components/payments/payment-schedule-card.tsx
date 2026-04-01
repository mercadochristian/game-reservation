'use client'

import { useState } from 'react'
import type { ScheduleWithPaymentSummary } from '@/app/api/admin/payments/schedules/route'
import type { PaymentWithExtraction } from '@/app/api/admin/payments/[id]/route'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronRight, Check, X, Eye, RefreshCw, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentScheduleCardProps {
  schedule: ScheduleWithPaymentSummary
  isExpanded: boolean
  onToggleExpand: (scheduleId: string) => void
  onApprove: (payment: PaymentWithExtraction) => void
  onReject: (payment: PaymentWithExtraction) => void
  onEdit: (payment: PaymentWithExtraction) => void
  onViewProof: (payment: PaymentWithExtraction) => void
  onReextract: (payment: PaymentWithExtraction) => void
  reextractingId?: string
  extractionEnabled: boolean
}

export function PaymentScheduleCard({
  schedule,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  onEdit,
  onViewProof,
  onReextract,
  reextractingId,
  extractionEnabled,
}: PaymentScheduleCardProps) {
  const [payments, setPayments] = useState<PaymentWithExtraction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalCollected, setTotalCollected] = useState(schedule.totalCollected)
  const [pendingCount, setPendingCount] = useState(schedule.pendingCount)

  const handleToggleExpand = async (scheduleId: string) => {
    onToggleExpand(scheduleId)

    if (!isExpanded && payments.length === 0) {
      // Lazy load payments when expanding
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/payments/${scheduleId}`)
        if (response.ok) {
          const data = await response.json()
          setPayments(data)
        }
      } catch (err) {
        console.error('Failed to fetch payments:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleApprove = (payment: PaymentWithExtraction) => {
    onApprove(payment)
    // Optimistically update
    setPayments((prev) =>
      prev.map((p) =>
        p.id === payment.id ? { ...p, payment_status: 'paid' } : p
      )
    )
    setTotalCollected((prev) => prev + (payment.extracted_amount ?? 0))
    setPendingCount((prev) => Math.max(0, prev - 1))
  }

  const handleReject = (payment: PaymentWithExtraction) => {
    onReject(payment)
    // Optimistically update
    setPayments((prev) =>
      prev.map((p) =>
        p.id === payment.id ? { ...p, payment_status: 'rejected' } : p
      )
    )
    setPendingCount((prev) => Math.max(0, prev - 1))
  }

  const dateLabel = formatScheduleDateWithWeekday(schedule.start_time)
  const timeLabel = formatScheduleTime(schedule.start_time)
  const locationName = schedule.locations?.name || 'Unknown Location'

  const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className={cn('border border-border rounded-lg bg-card overflow-hidden border-l-4 relative', isExpanded ? 'border-l-primary/60' : 'border-l-primary/40')}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary/60 to-primary/40"></div>

      {/* Header - Clickable to toggle expansion */}
      <button
        onClick={() => handleToggleExpand(schedule.id)}
        aria-expanded={isExpanded}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Chevron icon */}
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="size-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-5 text-muted-foreground" />
            )}
          </div>

          {/* Game info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">
              {dateLabel} · {timeLabel}
            </div>
            <div className="text-sm text-muted-foreground">{locationName}</div>
          </div>
        </div>

        {/* Payment summary badges */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
            ₱{totalCollected.toFixed(2)} collected
          </Badge>
          <Badge className="bg-amber-500/10 text-amber-400 border-0">
            {pendingCount} pending
          </Badge>
        </div>
      </button>

      {/* Expanded content - Payments table */}
      {isExpanded && (
        <div className="border-t border-border px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments for this game.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                    <TableHead className="hidden lg:table-cell">Confidence</TableHead>
                    <TableHead className="hidden lg:table-cell">Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="py-4">
                        <div className="font-medium text-foreground">
                          {payment.users?.first_name} {payment.users?.last_name}
                          {payment.registration_type !== 'solo' && (
                            <span className="ml-1 text-xs text-muted-foreground capitalize">
                              ({payment.registration_type})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[payment.payment_status] || STATUS_COLORS.pending}>
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {payment.extracted_amount ? `₱${payment.extracted_amount.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {payment.extracted_reference || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {payment.extraction_confidence ? (
                          <Badge className={CONFIDENCE_COLORS[payment.extraction_confidence]}>
                            {payment.extraction_confidence}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {payment.payment_note ? (
                          <div
                            title={payment.payment_note}
                            className="max-w-xs truncate text-muted-foreground text-xs"
                          >
                            {payment.payment_note}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(payment)}
                            title="Edit payment"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onViewProof(payment)}
                            title="View proof"
                          >
                            <Eye size={18} />
                          </Button>
                          {payment.payment_proof_url &&
                            (payment.extraction_confidence === 'failed' ||
                              !payment.extraction_confidence) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => onReextract(payment)}
                                disabled={reextractingId === payment.id}
                                title="Re-extract payment data"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20"
                              >
                                <RefreshCw
                                  size={18}
                                  className={
                                    reextractingId === payment.id ? 'animate-spin' : ''
                                  }
                                />
                              </Button>
                            )}
                          {payment.payment_status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleApprove(payment)}
                                title="Approve"
                                className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                              >
                                <Check size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleReject(payment)}
                                title="Reject"
                                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                <X size={18} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
