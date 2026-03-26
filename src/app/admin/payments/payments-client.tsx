'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, Check, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { GameFilter } from '@/components/game-filter'
import { createClient } from '@/lib/supabase/client'
import { type ScheduleWithLocation, type Location } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { logActivity, logError } from '@/lib/logger'

interface PaymentWithExtraction {
  id: string
  player_id: string | null
  users: { first_name: string | null; last_name: string | null } | null
  payment_status: 'pending' | 'review' | 'paid' | 'rejected'
  payment_proof_url: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: 'high' | 'medium' | 'low' | 'failed' | null
  required_amount: number
  created_at: string
}

interface PaymentsClientProps {
  schedules: ScheduleWithLocation[]
  selectedScheduleId: string | null
  initialRegistrations: PaymentWithExtraction[]
  initialTotalCollected: number
  initialPendingCount: number
  filterDate: string
  filterLocationId: string
  locations: Location[]
}

export function PaymentsClient({
  schedules,
  selectedScheduleId: initialScheduleId,
  initialRegistrations,
  initialTotalCollected,
  initialPendingCount,
  filterDate,
  filterLocationId,
  locations,
}: PaymentsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [registrations, setRegistrations] = useState<PaymentWithExtraction[]>(initialRegistrations)
  const [totalCollected, setTotalCollected] = useState(initialTotalCollected)
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [viewingProof, setViewingProof] = useState<{
    registration_id: string
    url: string
  } | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofLoading, setProofLoading] = useState(false)

  const selectedScheduleId = initialScheduleId
  
  // Handle view proof
  const handleViewProof = async (registration: PaymentWithExtraction) => {
    setViewingProof({ registration_id: registration.id, url: '' })
    setProofLoading(true)

    try {
      if (!registration.payment_proof_url) {
        toast.error('No proof URL')
        setViewingProof(null)
        return
      }

      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(registration.payment_proof_url, 3600)

      if (error) throw error

      setProofUrl(data.signedUrl)
      setViewingProof({ registration_id: registration.id, url: data.signedUrl })
    } catch (error) {
      console.error('[Payments] Failed to get signed URL:', error)
      toast.error('Failed to load proof image', { description: getUserFriendlyMessage(error) })
      setViewingProof(null)
    } finally {
      setProofLoading(false)
    }
  }

  // Handle approve
  const handleApprove = async (payment: PaymentWithExtraction) => {
    try {
      const user = await supabase.auth.getUser()
      const { error } = await (supabase.from('registration_payments') as any)
        .update({ payment_status: 'paid' })
        .eq('id', payment.id)

      if (error) throw error

      if (user.data.user?.id) {
        await logActivity('payment.approve', user.data.user.id, {
          user_payment_id: payment.id,
          player_id: payment.player_id,
          amount: payment.extracted_amount,
          reference: payment.extracted_reference,
        })
      }

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === payment.id ? { ...r, payment_status: 'paid' } : r
        )
      )

      // Recalculate totals
      const updatedRegs = registrations.map((r) =>
        r.id === payment.id ? { ...r, payment_status: 'paid' as const } : r
      )
      const paid = updatedRegs.filter((r) => r.payment_status === 'paid')
      setTotalCollected(paid.reduce((sum, r) => sum + (r.extracted_amount ?? 0), 0))
      setPendingCount(updatedRegs.filter((r) => r.payment_status === 'pending').length)

      toast.success('Payment approved')
    } catch (error) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId) {
        await logError('payment.approve_failed', error, userId, {
          user_payment_id: payment.id,
        })
      }
      console.error('[Payments] Failed to approve payment:', error)
      toast.error('Failed to approve payment', { description: getUserFriendlyMessage(error) })
    }
  }

  // Handle reject
  const handleReject = async (payment: PaymentWithExtraction) => {
    try {
      const user = await supabase.auth.getUser()
      const { error } = await (supabase.from('registration_payments') as any)
        .update({ payment_status: 'rejected' })
        .eq('id', payment.id)

      if (error) throw error

      if (user.data.user?.id) {
        await logActivity('payment.reject', user.data.user.id, {
          user_payment_id: payment.id,
          player_id: payment.player_id,
          reason: 'Admin rejected via payments page',
        })
      }

      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === payment.id ? { ...r, payment_status: 'rejected' } : r
        )
      )

      // Recalculate totals
      const updatedRegs = registrations.map((r) =>
        r.id === payment.id ? { ...r, payment_status: 'rejected' as const } : r
      )
      setPendingCount(updatedRegs.filter((r) => r.payment_status === 'pending').length)

      toast.success('Payment rejected')
    } catch (error) {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (userId) {
        await logError('payment.reject_failed', error, userId, {
          user_payment_id: payment.id,
        })
      }
      console.error('[Payments] Failed to reject payment:', error)
      toast.error('Failed to reject payment', { description: getUserFriendlyMessage(error) })
    }
  }

  const confidenceColors: Record<string, string> = {
    high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const skeletonColumns = [
    { header: 'Player', isPrimary: true, skeletonWidth: 'w-32' },
    { header: 'Status', skeletonWidth: 'w-20' },
    { header: 'Amount', skeletonWidth: 'w-20' },
    { header: 'Reference', className: 'hidden sm:table-cell', skeletonWidth: 'w-24' },
    { header: 'Confidence', className: 'hidden md:table-cell', skeletonWidth: 'w-20' },
    { header: 'Actions', className: 'text-right', isAction: true, skeletonWidth: 'w-32' },
  ]

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Payments"
          title="Payment Review"
          description="Verify and manage payment proofs"
        />

        {/* Filter Accordion */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-8"
        >
          <GameFilter
            locations={locations}
            filterDate={filterDate}
            filterLocationId={filterLocationId}
          />
        </motion.div>

        {/* Schedule Selector or Empty State */}
        {!filterDate && !filterLocationId ? (
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg p-12 text-center"
          >
            <ImageIcon size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a date or location to view schedules</p>
          </motion.div>
        ) : schedules.length > 0 ? (
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="mb-8"
          >
            <p className="text-sm font-medium mb-3">Select a Schedule</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (filterDate) params.set('date', filterDate)
                    if (filterLocationId) params.set('locationId', filterLocationId)
                    params.set('scheduleId', schedule.id)
                    router.push(`/admin/payments?${params.toString()}`)
                  }}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedScheduleId === schedule.id
                      ? 'border-accent bg-accent/5 ring-2 ring-accent'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <p className="font-medium text-foreground text-sm">{formatScheduleLabel(schedule)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{schedule.locations?.name || 'Unknown'}</p>
                </Card>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg p-12 text-center"
          >
            <ImageIcon size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No schedules found for the selected filters</p>
          </motion.div>
        )}

        {/* Summary Cards */}
        {selectedScheduleId && (
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            <Card className="p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">Total Collected (Paid)</p>
              <p className="text-3xl font-bold text-foreground">&#8369;{totalCollected.toFixed(2)}</p>
            </Card>
            <Card className="p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-2">Pending Review</p>
              <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
            </Card>
          </motion.div>
        )}

        {/* Registrations Table */}
        {selectedScheduleId && (
          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg overflow-hidden"
          >
            {registrations.length === 0 ? (
              <div className="p-12 text-center">
                <ImageIcon size={48} className="text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">No registrations for this schedule</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Player</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Reference</TableHead>
                    <TableHead className="hidden md:table-cell">Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((reg) => (
                    <TableRow key={reg.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="font-medium text-foreground">
                          {reg.users?.first_name} {reg.users?.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[reg.payment_status] || statusColors.pending}
                        >
                          {reg.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {reg.extracted_amount ? `&#8369;${reg.extracted_amount.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {reg.extracted_reference || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {reg.extraction_confidence ? (
                          <Badge className={confidenceColors[reg.extraction_confidence]}>
                            {reg.extraction_confidence}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleViewProof(reg)}
                            title="View proof"
                          >
                            <Eye size={18} />
                          </Button>
                          {reg.payment_status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleApprove(reg)}
                                title="Approve"
                                className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20"
                              >
                                <Check size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleReject(reg)}
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
            )}
          </motion.div>
        )}
      </div>

      {/* Proof Image Modal */}
      <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {proofLoading ? (
            <div className="flex items-center justify-center h-96 bg-muted/50 rounded">
              <p className="text-muted-foreground">Loading image...</p>
            </div>
          ) : proofUrl ? (
            <div className="space-y-4">
              <img src={proofUrl} alt="Payment proof" className="w-full rounded border border-border" />
              {viewingProof && registrations.find((r) => r.id === viewingProof.registration_id) && (
                <div className="bg-muted/50 p-4 rounded border border-border space-y-2 text-sm">
                  {(() => {
                    const reg = registrations.find((r) => r.id === viewingProof!.registration_id)
                    return (
                      <>
                        <div>
                          <p className="text-muted-foreground">Extracted Amount</p>
                          <p className="font-mono font-semibold">
                            {reg?.extracted_amount ? `&#8369;${reg.extracted_amount.toFixed(2)}` : 'Not extracted'}
                          </p>
                        </div>
                        {reg?.extracted_reference && (
                          <div>
                            <p className="text-muted-foreground">Reference</p>
                            <p className="font-mono font-semibold">{reg.extracted_reference}</p>
                          </div>
                        )}
                        {reg?.extracted_sender && (
                          <div>
                            <p className="text-muted-foreground">Sender</p>
                            <p className="font-semibold">{reg.extracted_sender}</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 bg-muted/50 rounded">
              <p className="text-muted-foreground">Failed to load image</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
