'use client'

import { useState, useEffect, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, Check, X, RefreshCw, Pencil, Calendar } from 'lucide-react'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { usePaymentsByLocation } from '@/lib/hooks/usePaymentsByLocation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentsFilterBar } from '@/components/payments/payments-filter-bar'
import { PaymentScheduleCard } from '@/components/payments/payment-schedule-card'
import { createClient } from '@/lib/supabase/client'
import { type Location } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { logActivity, logError } from '@/lib/logger'
import { Input } from '@/components/ui/input'
import type { ScheduleWithPaymentSummary } from '@/app/api/admin/payments/schedules/route'
import type { PaymentWithExtraction } from '@/app/api/admin/payments/[id]/route'

function ExtractionStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Extracting…
      </span>
    )
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-success" />
        Extracted
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-destructive cursor-help"
      title="AI extraction failed. Payment details must be entered manually."
    >
      <X className="h-3 w-3" />
      Extraction failed
    </span>
  )
}

interface PaymentDialogState {
  viewingProof: { payment_id: string; url: string } | null
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
  | { type: 'OPEN_PROOF'; payment_id: string }
  | { type: 'SET_PROOF_URL'; url: string }
  | { type: 'SET_PROOF_LOADING'; loading: boolean }
  | { type: 'CLOSE_PROOF' }
  | { type: 'SET_REEXTRACTING'; id: string | null }
  | { type: 'OPEN_EDIT'; payment: PaymentWithExtraction }
  | { type: 'SET_EDIT_FORM'; field: keyof PaymentDialogState['editForm']; value: string }
  | { type: 'CLOSE_EDIT' }
  | { type: 'SET_EDIT_SUBMITTING'; submitting: boolean }

function paymentDialogReducer(state: PaymentDialogState, action: PaymentDialogAction): PaymentDialogState {
  switch (action.type) {
    case 'OPEN_PROOF':
      return { ...state, viewingProof: { payment_id: action.payment_id, url: '' }, proofLoading: true }
    case 'SET_PROOF_URL':
      return { ...state, proofUrl: action.url, proofLoading: false }
    case 'SET_PROOF_LOADING':
      return { ...state, proofLoading: action.loading }
    case 'CLOSE_PROOF':
      return { ...state, viewingProof: null, proofUrl: null }
    case 'SET_REEXTRACTING':
      return { ...state, reextracting: action.id }
    case 'OPEN_EDIT':
      return {
        ...state,
        editingPayment: action.payment,
        editForm: {
          extracted_amount: action.payment.extracted_amount?.toString() ?? '',
          extracted_reference: action.payment.extracted_reference ?? '',
          extracted_datetime: action.payment.extracted_datetime ?? '',
          extracted_sender: action.payment.extracted_sender ?? '',
          payment_note: action.payment.payment_note ?? '',
        },
      }
    case 'SET_EDIT_FORM':
      return {
        ...state,
        editForm: { ...state.editForm, [action.field]: action.value },
      }
    case 'CLOSE_EDIT':
      return {
        ...state,
        editingPayment: null,
        editForm: initialPaymentDialogState.editForm,
      }
    case 'SET_EDIT_SUBMITTING':
      return { ...state, editSubmitting: action.submitting }
    default:
      return state
  }
}

interface PaymentsClientProps {
  locations: Location[]
  initialSearchParams?: Record<string, string>
  extractionEnabled: boolean
}

export function PaymentsClient({ locations, initialSearchParams = {}, extractionEnabled }: PaymentsClientProps) {
  const router = useRouter()
  const hasAnimated = useHasAnimated()
  const supabase = createClient()

  // Filter state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    initialSearchParams.locationId || null
  )
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'last7' | 'last30' | 'date'>(
    (initialSearchParams.dateRange as 'all' | 'last7' | 'last30' | 'date') || 'all'
  )
  const [selectedDate, setSelectedDate] = useState<string>(
    initialSearchParams.date || ''
  )
  const [expandedScheduleIds, setExpandedScheduleIds] = useState<Set<string>>(new Set())
  const [dialogState, dispatch] = useReducer(paymentDialogReducer, initialPaymentDialogState)

  // Data fetching
  const dateRangeParam =
    selectedDateRange === 'date' && selectedDate
      ? `date:${selectedDate}`
      : selectedDateRange
  const { schedules, isLoading } = usePaymentsByLocation(selectedLocationId, dateRangeParam)

  // URL sync on filter change
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedLocationId) {
      params.set('locationId', selectedLocationId)
    }
    if (selectedDateRange !== 'all') {
      params.set('dateRange', selectedDateRange)
    }
    if (selectedDateRange === 'date' && selectedDate) {
      params.set('date', selectedDate)
    }

    router.replace(`/dashboard/payments?${params.toString()}`)
  }, [selectedLocationId, selectedDateRange, selectedDate, router])

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId || null)
    setExpandedScheduleIds(new Set())
  }

  const handleDateRangeChange = (dateRange: 'all' | 'last7' | 'last30' | 'date') => {
    setSelectedDateRange(dateRange)
    if (dateRange !== 'date') {
      setSelectedDate('')
    }
  }

  const handleToggleExpand = (scheduleId: string) => {
    setExpandedScheduleIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId)
      } else {
        newSet.add(scheduleId)
      }
      return newSet
    })
  }

  const handleViewProof = async (payment: PaymentWithExtraction) => {
    if (!payment.payment_proof_url) return

    dispatch({ type: 'OPEN_PROOF', payment_id: payment.id })
    dispatch({ type: 'SET_PROOF_LOADING', loading: true })

    try {
      const { data } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(payment.payment_proof_url, 3600)

      if (data?.signedUrl) {
        dispatch({ type: 'SET_PROOF_URL', url: data.signedUrl })
      }
    } catch (error) {
      console.error('Failed to get signed URL:', error)
      toast.error('Failed to load proof image')
      dispatch({ type: 'CLOSE_PROOF' })
    }
  }

  const handleReextract = async (payment: PaymentWithExtraction) => {
    dispatch({ type: 'SET_REEXTRACTING', id: payment.id })

    try {
      const response = await fetch('/api/payment-proof/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id }),
      })

      if (!response.ok) throw new Error('Failed to re-extract')

      toast.success('Payment data re-extracted')
      router.refresh()
    } catch (error) {
      console.error('[Payments] Re-extract failed:', error)
      toast.error('Failed to re-extract payment data', {
        description: getUserFriendlyMessage(error),
      })
    } finally {
      dispatch({ type: 'SET_REEXTRACTING', id: null })
    }
  }

  const handleApprove = async (payment: PaymentWithExtraction) => {
    try {
      const { error } = await supabase.from('registration_payments')
        .update({ payment_status: 'paid' })
        .eq('id', payment.id)

      if (error) throw error

      toast.success('Payment approved')
      void logActivity('payment.approved', `Payment ${payment.id} approved`)
      router.refresh()
    } catch (error) {
      console.error('[Payments] Approve failed:', error)
      toast.error('Failed to approve payment', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  const handleReject = async (payment: PaymentWithExtraction) => {
    try {
      const { error } = await supabase.from('registration_payments')
        .update({ payment_status: 'rejected' })
        .eq('id', payment.id)

      if (error) throw error

      toast.success('Payment rejected')
      void logActivity('payment.rejected', `Payment ${payment.id} rejected`)
      router.refresh()
    } catch (error) {
      console.error('[Payments] Reject failed:', error)
      toast.error('Failed to reject payment', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  const handleEditPayment = async (targetStatus: 'review' | 'paid') => {
    if (!dialogState.editingPayment) return

    dispatch({ type: 'SET_EDIT_SUBMITTING', submitting: true })

    try {
      const requestPayload = {
        extracted_amount: dialogState.editForm.extracted_amount
          ? parseFloat(dialogState.editForm.extracted_amount)
          : null,
        extracted_reference: dialogState.editForm.extracted_reference || null,
        extracted_datetime: dialogState.editForm.extracted_datetime || null,
        extracted_sender: dialogState.editForm.extracted_sender || null,
        payment_note: dialogState.editForm.payment_note || null,
      }

      const response = await fetch(
        `/api/admin/payments/${dialogState.editingPayment.id}/edit`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment')
      }

      const { error: statusError } = await supabase.from('registration_payments')
        .update({ payment_status: targetStatus })
        .eq('id', dialogState.editingPayment.id)

      if (statusError) throw statusError

      dispatch({ type: 'CLOSE_EDIT' })
      toast.success(
        targetStatus === 'paid' ? 'Payment approved' : 'Payment saved for review'
      )
      void logActivity('payment.edited', `Payment ${dialogState.editingPayment.id} edited`)
      router.refresh()
    } catch (error) {
      console.error('[Payments] Edit failed:', error)
      toast.error('Failed to save payment', {
        description: getUserFriendlyMessage(error),
      })
    } finally {
      dispatch({ type: 'SET_EDIT_SUBMITTING', submitting: false })
    }
  }

  const { viewingProof, proofUrl, proofLoading, reextracting, editingPayment, editForm, editSubmitting } = dialogState

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Payments"
          title="Payment Review"
          description="Verify and manage payment proofs"
        />

        {/* Filter Bar */}
        <motion.div
          custom={0}
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          className="mb-8"
        >
          <PaymentsFilterBar
            locations={locations}
            selectedLocationId={selectedLocationId}
            selectedDateRange={selectedDateRange}
            selectedDate={selectedDate || null}
            onLocationChange={handleLocationChange}
            onDateRangeChange={handleDateRangeChange}
            onDateChange={(date) => setSelectedDate(date || '')}
            extractionEnabled={extractionEnabled}
          />
        </motion.div>

        {/* Schedule Cards */}
        <motion.div
          custom={1}
          initial={hasAnimated.current ? false : 'hidden'}
          animate="visible"
          variants={fadeUpVariants}
          className="space-y-4"
        >
          {!selectedLocationId ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Select a location to view games and their payments.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card border-border border rounded-lg p-4 h-20 animate-pulse" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No games found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <PaymentScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  isExpanded={expandedScheduleIds.has(schedule.id)}
                  onToggleExpand={handleToggleExpand}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={(payment) => dispatch({ type: 'OPEN_EDIT', payment })}
                  onViewProof={handleViewProof}
                  onReextract={handleReextract}
                  reextractingId={reextracting || undefined}
                  extractionEnabled={extractionEnabled}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Proof Image Dialog */}
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
              <img src={proofUrl} alt="Payment proof" className="w-full rounded border border-border" />
            ) : (
              <p className="text-center text-muted-foreground">Failed to load image</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Payment Dialog */}
      {editingPayment && (
        <Dialog open onOpenChange={() => dispatch({ type: 'CLOSE_EDIT' })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Update payment details for {editingPayment.users?.first_name} {editingPayment.users?.last_name}
              </DialogDescription>
              <ExtractionStatusBadge status={editingPayment.extraction_status} />
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
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
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
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
                <Label htmlFor="datetime">Date & Time</Label>
                <Input
                  id="datetime"
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
                <Label htmlFor="sender">Sender</Label>
                <Input
                  id="sender"
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

              <div>
                <Label htmlFor="note">Note (max 200 chars)</Label>
                <textarea
                  id="note"
                  value={editForm.payment_note}
                  maxLength={200}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_EDIT_FORM',
                      field: 'payment_note',
                      value: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-input border-border border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editForm.payment_note.length}/200
                </p>
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
                onClick={() => handleEditPayment('review')}
                disabled={editSubmitting}
              >
                Save
              </Button>
              <Button
                variant="default"
                onClick={() => handleEditPayment('paid')}
                disabled={editSubmitting}
              >
                Save & Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
