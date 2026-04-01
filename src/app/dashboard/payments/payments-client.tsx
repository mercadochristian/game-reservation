'use client'

import { useState, useEffect, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, Check, X, Image as ImageIcon, RefreshCw, Pencil, Calendar } from 'lucide-react'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { GameFilter } from '@/components/game-filter'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { type ScheduleWithLocation, type Location } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { logActivity, logError } from '@/lib/logger'
import { ScheduleInfo } from '@/components/schedule-info'

interface PaymentWithExtraction {
  id: string
  player_id: string | null
  users: { first_name: string | null; last_name: string | null } | null
  payer: { first_name: string | null; last_name: string | null } | null
  payment_status: 'pending' | 'review' | 'paid' | 'rejected'
  payment_proof_url: string | null
  extracted_amount: number | null
  extracted_reference: string | null
  extracted_datetime: string | null
  extracted_sender: string | null
  extraction_confidence: 'high' | 'medium' | 'low' | 'failed' | null
  required_amount: number
  registration_type: 'solo' | 'group' | 'team'
  created_at: string
  payment_note: string | null
}

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

// --- Dialog state reducer ---
interface PaymentDialogState {
  viewingProof: { registration_id: string; url: string } | null
  proofUrl: string | null
  proofLoading: boolean
  reextracting: string | null
  editingPayment: PaymentWithExtraction | null
  editForm: {
    extracted_amount: string
    extracted_reference: string
    extracted_datetime: string
    extracted_sender: string
    payment_note: string
  }
  editSubmitting: boolean
}

export const initialPaymentDialogState: PaymentDialogState = {
  viewingProof: null,
  proofUrl: null,
  proofLoading: false,
  reextracting: null,
  editingPayment: null,
  editForm: {
    extracted_amount: '',
    extracted_reference: '',
    extracted_datetime: '',
    extracted_sender: '',
    payment_note: '',
  },
  editSubmitting: false,
}

type PaymentDialogAction =
  | { type: 'OPEN_PROOF'; registration_id: string }
  | { type: 'SET_PROOF_URL'; url: string }
  | { type: 'SET_PROOF_LOADING'; loading: boolean }
  | { type: 'CLOSE_PROOF' }
  | { type: 'SET_REEXTRACTING'; id: string | null }
  | { type: 'OPEN_EDIT'; payment: PaymentWithExtraction }
  | { type: 'SET_EDIT_FORM'; field: keyof PaymentDialogState['editForm']; value: string }
  | { type: 'SET_EDIT_SUBMITTING'; submitting: boolean }
  | { type: 'CLOSE_EDIT' }

export function paymentDialogReducer(
  state: PaymentDialogState,
  action: PaymentDialogAction,
): PaymentDialogState {
  switch (action.type) {
    case 'OPEN_PROOF':
      return {
        ...state,
        viewingProof: { registration_id: action.registration_id, url: '' },
        proofLoading: true,
        proofUrl: null,
      }
    case 'SET_PROOF_URL':
      return {
        ...state,
        proofUrl: action.url,
        viewingProof: state.viewingProof
          ? { ...state.viewingProof, url: action.url }
          : null,
      }
    case 'SET_PROOF_LOADING':
      return { ...state, proofLoading: action.loading }
    case 'CLOSE_PROOF':
      return { ...state, viewingProof: null, proofUrl: null, proofLoading: false }
    case 'SET_REEXTRACTING':
      return { ...state, reextracting: action.id }
    case 'OPEN_EDIT': {
      const p = action.payment
      let dt = ''
      if (p.extracted_datetime) {
        const d = new Date(p.extracted_datetime)
        if (!isNaN(d.getTime())) {
          dt = d.toISOString().slice(0, 16)
        }
      }
      return {
        ...state,
        editingPayment: p,
        editForm: {
          extracted_amount: p.extracted_amount != null ? String(p.extracted_amount) : '',
          extracted_reference: p.extracted_reference ?? '',
          extracted_datetime: dt,
          extracted_sender: p.extracted_sender ?? '',
          payment_note: p.payment_note ?? '',
        },
      }
    }
    case 'SET_EDIT_FORM':
      return {
        ...state,
        editForm: { ...state.editForm, [action.field]: action.value },
      }
    case 'SET_EDIT_SUBMITTING':
      return { ...state, editSubmitting: action.submitting }
    case 'CLOSE_EDIT':
      return {
        ...state,
        editingPayment: null,
        editSubmitting: false,
        editForm: initialPaymentDialogState.editForm,
      }
    default:
      return state
  }
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
  const { user: currentUser } = useUser()
  const hasAnimated = useHasAnimated()
  const [registrations, setRegistrations] = useState<PaymentWithExtraction[]>(initialRegistrations)
  const [totalCollected, setTotalCollected] = useState(initialTotalCollected)
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [dialogState, dispatch] = useReducer(
    paymentDialogReducer,
    initialPaymentDialogState,
  )
  const {
    viewingProof,
    proofUrl,
    proofLoading,
    reextracting,
    editingPayment,
    editForm,
    editSubmitting,
  } = dialogState

  const selectedScheduleId = initialScheduleId
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId)

  // Sync state with props when they change (from router.refresh or URL navigation)
  useEffect(() => {
    setRegistrations(initialRegistrations)
    setTotalCollected(initialTotalCollected)
    setPendingCount(initialPendingCount)
  }, [initialRegistrations, initialTotalCollected, initialPendingCount])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
  }

  // Handle re-extraction
  const handleReextract = async (registration: PaymentWithExtraction) => {
    if (!registration.payment_proof_url) {
      toast.error('No payment proof URL')
      return
    }

    dispatch({ type: 'SET_REEXTRACTING', id: registration.id })
    try {
      const response = await fetch('/api/payment-proof/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_payment_id: registration.id,
          payment_proof_url: registration.payment_proof_url,
        }),
      })

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.status}`)
      }

      toast.success('Re-extraction started')
      // Refresh the page to show updated extraction data
      router.refresh()
    } catch (error) {
      console.error('[Payments] Re-extraction failed:', error)
      toast.error('Re-extraction failed', { description: getUserFriendlyMessage(error) })
    } finally {
      dispatch({ type: 'SET_REEXTRACTING', id: null })
    }
  }
  
  // Handle view proof
  const handleViewProof = async (registration: PaymentWithExtraction) => {
    dispatch({ type: 'OPEN_PROOF', registration_id: registration.id })

    try {
      if (!registration.payment_proof_url) {
        toast.error('No proof URL')
        dispatch({ type: 'CLOSE_PROOF' })
        return
      }

      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(registration.payment_proof_url, 3600)

      if (error) throw error

      dispatch({ type: 'SET_PROOF_URL', url: data.signedUrl })
      dispatch({ type: 'SET_PROOF_LOADING', loading: false })
    } catch (error) {
      console.error('[Payments] Failed to get signed URL:', error)
      toast.error('Failed to load proof image', { description: getUserFriendlyMessage(error) })
      dispatch({ type: 'CLOSE_PROOF' })
    }
  }

  // Handle approve
  const handleApprove = async (payment: PaymentWithExtraction) => {
    try {
      const { error } = await (supabase.from('registration_payments') as any)
        .update({ payment_status: 'paid' })
        .eq('id', payment.id)

      if (error) throw error

      if (currentUser?.id) {
        await logActivity('payment.approve', currentUser.id, {
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
      router.refresh()
    } catch (error) {
      if (currentUser?.id) {
        await logError('payment.approve_failed', error, currentUser.id, {
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
      const { error } = await (supabase.from('registration_payments') as any)
        .update({ payment_status: 'rejected' })
        .eq('id', payment.id)

      if (error) throw error

      if (currentUser?.id) {
        await logActivity('payment.reject', currentUser.id, {
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
      router.refresh()
    } catch (error) {
      if (currentUser?.id) {
        await logError('payment.reject_failed', error, currentUser.id, {
          user_payment_id: payment.id,
        })
      }
      console.error('[Payments] Failed to reject payment:', error)
      toast.error('Failed to reject payment', { description: getUserFriendlyMessage(error) })
    }
  }

  // Handle edit payment
  const submitEditPayment = async (targetStatus: 'review' | 'paid') => {
    if (!editingPayment) return

    dispatch({ type: 'SET_EDIT_SUBMITTING', submitting: true })
    try {
      const updatePayload = {
        payment_status: targetStatus,
        extracted_amount: editForm.extracted_amount
          ? parseFloat(editForm.extracted_amount)
          : null,
        extracted_reference: editForm.extracted_reference || null,
        extracted_datetime: editForm.extracted_datetime
          ? new Date(editForm.extracted_datetime).toISOString()
          : null,
        extracted_sender: editForm.extracted_sender || null,
      }

      const { error } = await (supabase.from('registration_payments') as any)
        .update(updatePayload)
        .eq('id', editingPayment.id)

      if (error) throw error

      if (currentUser?.id) {
        await logActivity('payment.edit', currentUser.id, {
          user_payment_id: editingPayment.id,
          player_id: editingPayment.player_id,
          new_status: targetStatus,
          extracted_amount: updatePayload.extracted_amount,
          extracted_reference: updatePayload.extracted_reference,
        })
      }

      // Optimistic update
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === editingPayment.id
            ? {
                ...r,
                payment_status: targetStatus,
                extracted_amount: updatePayload.extracted_amount as number | null,
                extracted_reference: updatePayload.extracted_reference as string | null,
                extracted_datetime: updatePayload.extracted_datetime as string | null,
                extracted_sender: updatePayload.extracted_sender as string | null,
              }
            : r
        )
      )

      dispatch({ type: 'CLOSE_EDIT' })
      toast.success(
        targetStatus === 'paid' ? 'Payment approved' : 'Payment saved for review'
      )
      router.refresh()
    } catch (error) {
      if (currentUser?.id) {
        await logError('payment.edit_failed', error, currentUser.id, {
          user_payment_id: editingPayment.id,
        })
      }
      console.error('[Payments] Failed to edit payment:', error)
      toast.error('Failed to save payment', {
        description: getUserFriendlyMessage(error),
      })
    } finally {
      dispatch({ type: 'SET_EDIT_SUBMITTING', submitting: false })
    }
  }

  const handleEditSave = () => submitEditPayment('review')
  const handleEditSaveAndApprove = () => submitEditPayment('paid')

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Payments"
          title="Payment Review"
          description="Verify and manage payment proofs"
          action={{
            label: 'Refresh',
            icon: RefreshCw,
            onClick: handleRefresh,
          }}
        />

        {/* Filter Accordion */}
        <motion.div
          custom={0}
          initial={hasAnimated.current ? false : "hidden"}
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

        {/* Schedules Section */}
        <motion.div
          custom={1}
          initial={hasAnimated.current ? false : "hidden"}
          animate="visible"
          variants={fadeUpVariants}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-3 text-foreground">Games</h2>

          {!filterDate && !filterLocationId ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Select a date or location to view games.</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No games found.</p>
              <p className="text-sm text-muted-foreground">Adjust your filters to see available games.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => {
                const isSelected = schedule.id === selectedScheduleId
                return (
                  <div
                    key={schedule.id}
                    className={`bg-card border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="mb-3">
                      <ScheduleInfo schedule={schedule} />
                    </div>
                    <Button
                      onClick={() => {
                        const params = new URLSearchParams()
                        if (filterDate) params.set('date', filterDate)
                        if (filterLocationId) params.set('locationId', filterLocationId)
                        params.set('scheduleId', schedule.id)
                        router.push(`/dashboard/payments?${params.toString()}`)
                      }}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      {isSelected ? 'Selected' : 'View Payments'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Summary Cards */}
        {selectedScheduleId && (
          <>
            <motion.div
              custom={2}
              initial={hasAnimated.current ? false : "hidden"}
              animate="visible"
              variants={fadeUpVariants}
              className="mb-4"
            >
              <h2 className="text-lg font-semibold text-foreground">
                Payments for:{' '}
                <span className="text-primary">
                  {selectedSchedule ? formatScheduleLabel(selectedSchedule) : ''}
                </span>
              </h2>
            </motion.div>

            <motion.div
              custom={3}
              initial={hasAnimated.current ? false : "hidden"}
              animate="visible"
              variants={fadeUpVariants}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            >
              <Card className="p-6 bg-card">
                <p className="text-sm text-muted-foreground mb-2">Total Collected (Paid)</p>
                <p className="text-3xl font-bold text-foreground">₱{totalCollected.toFixed(2)}</p>
              </Card>
              <Card className="p-6 bg-card">
                <p className="text-sm text-muted-foreground mb-2">Pending Review</p>
                <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
              </Card>
            </motion.div>
          </>
        )}

        {/* Registrations Table */}
        {selectedScheduleId && (
          <motion.div
            custom={4}
            initial={hasAnimated.current ? false : "hidden"}
            animate="visible"
            variants={fadeUpVariants}
            className="bg-card border-border border rounded-lg overflow-hidden"
          >
            {registrations.length === 0 ? (
              <div className="p-12 text-center">
                <ImageIcon size={48} className="mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No payments for this schedule.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Player</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Reference</TableHead>
                    <TableHead className="hidden lg:table-cell">Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((reg) => (
                    <TableRow key={reg.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="font-medium text-foreground">
                          {reg.users?.first_name} {reg.users?.last_name}
                          {reg.registration_type !== 'solo' && (
                            <span className="ml-1 text-xs text-muted-foreground capitalize">({reg.registration_type})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={STATUS_COLORS[reg.payment_status] || STATUS_COLORS.pending}
                        >
                          {reg.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {reg.extracted_amount ? `₱${reg.extracted_amount.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {reg.extracted_reference || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {reg.extraction_confidence ? (
                          <Badge className={CONFIDENCE_COLORS[reg.extraction_confidence]}>
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
                            onClick={() => dispatch({ type: 'OPEN_EDIT', payment: reg })}
                            title="Edit payment"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleViewProof(reg)}
                            title="View proof"
                          >
                            <Eye size={18} />
                          </Button>
                          {reg.payment_proof_url && (reg.extraction_confidence === 'failed' || !reg.extraction_confidence) && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleReextract(reg)}
                              disabled={reextracting === reg.id}
                              title="Re-extract payment data"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20"
                            >
                              <RefreshCw size={18} className={reextracting === reg.id ? 'animate-spin' : ''} />
                            </Button>
                          )}
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

      {/* Proof Image Modal — conditionally mounted */}
      {viewingProof && (
      <Dialog open onOpenChange={() => dispatch({ type: 'CLOSE_PROOF' })}>
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
                            {reg?.extracted_amount ? `₱${reg.extracted_amount.toFixed(2)}` : 'Not extracted'}
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
      )}

      {/* Edit Payment Dialog — conditionally mounted */}
      {editingPayment && (
      <Dialog open onOpenChange={(open) => { if (!open) dispatch({ type: 'CLOSE_EDIT' }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              {editingPayment.users?.first_name} {editingPayment.users?.last_name}
              {' · '}
              <span className="capitalize">{editingPayment.payment_status}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-amount" className="text-sm mb-1.5 block">
                Amount (₱)
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={editForm.extracted_amount}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_EDIT_FORM',
                    field: 'extracted_amount',
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-reference" className="text-sm mb-1.5 block">
                Reference
              </Label>
              <Input
                id="edit-reference"
                type="text"
                placeholder="Transaction reference"
                value={editForm.extracted_reference}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_EDIT_FORM',
                    field: 'extracted_reference',
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-datetime" className="text-sm mb-1.5 block">
                Payment Date &amp; Time
              </Label>
              <Input
                id="edit-datetime"
                type="datetime-local"
                value={editForm.extracted_datetime}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_EDIT_FORM',
                    field: 'extracted_datetime',
                    value: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-sender" className="text-sm mb-1.5 block">
                Sender Name
              </Label>
              <Input
                id="edit-sender"
                type="text"
                placeholder="Account holder name"
                value={editForm.extracted_sender}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_EDIT_FORM',
                    field: 'extracted_sender',
                    value: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'CLOSE_EDIT' })}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleEditSave}
              disabled={editSubmitting}
            >
              {editSubmitting ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={handleEditSaveAndApprove}
              disabled={editSubmitting}
            >
              {editSubmitting ? 'Saving...' : 'Save and Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}
