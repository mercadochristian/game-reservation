'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PaymentBlockedPayload {
  error: string
  payment_status: string
  required_amount?: number
  payment_note?: string | null
}

interface SuccessPayload {
  registration_id: string
  schedule: { id: string; title: string; start_time: string } | null
  player: { id: string; first_name: string | null; last_name: string | null } | null
  payment_status: string
  attended: boolean
  already_attended: boolean
}

type ScanResult = SuccessPayload | PaymentBlockedPayload | null

interface ScanResultCardProps {
  result: ScanResult
}

function isPaymentBlocked(result: ScanResult): result is PaymentBlockedPayload {
  return result !== null && 'error' in result && result.error === 'Payment not approved'
}

function isSuccessPayload(result: ScanResult): result is SuccessPayload {
  return result !== null && 'registration_id' in result
}

export function ScanResultCard({ result }: ScanResultCardProps) {
  const playerName = useMemo(() => {
    if (!isSuccessPayload(result) || !result.player) return 'Unknown player'
    return `${result.player.first_name ?? ''} ${result.player.last_name ?? ''}`.trim() || 'Unknown player'
  }, [result])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  if (!result) return null

  // Payment blocked state
  if (isPaymentBlocked(result)) {
    const paymentStatus = result.payment_status
    const requiredAmount = result.required_amount ? formatCurrency(result.required_amount) : 'Unknown'
    const rejectionReason = result.payment_note

    if (paymentStatus === 'rejected') {
      return (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-red-600 dark:text-red-400">✕ Payment Rejected</CardTitle>
            </div>
            <CardDescription>This registration cannot be marked for attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Rejection Reason</p>
              <p className="text-sm text-foreground mt-1">{rejectionReason || 'No reason provided'}</p>
            </div>
            <p className="text-sm text-muted-foreground">Please contact the admin to resolve this payment issue.</p>
            <Button variant="outline" disabled title="Coming soon">
              Notify Admin
            </Button>
          </CardContent>
        </Card>
      )
    }

    // Pending or review
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-amber-600 dark:text-amber-400">⚠ Payment Not Approved</CardTitle>
          </div>
          <CardDescription>This registration cannot be marked for attendance until payment is approved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Required Amount:</span>
              <span className="text-lg font-bold text-foreground">{requiredAmount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status: <span className="capitalize font-medium">{paymentStatus}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Please contact the admin to proceed with payment verification.</p>
          <Button variant="outline" disabled title="Coming soon">
            Notify Admin
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (isSuccessPayload(result)) {
    return (
      <Card className={result.already_attended ? 'border-blue-500/30 bg-blue-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}>
        <CardHeader>
          <CardTitle className={result.already_attended ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {result.already_attended ? 'ℹ Already Checked In' : '✓ Attendance Marked'}
          </CardTitle>
          <CardDescription>Registration ID: {result.registration_id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{playerName}</Badge>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              Payment: Paid
            </Badge>
            <Badge className={result.already_attended ? 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}>
              {result.already_attended ? 'Already Marked' : 'Marked Today'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Schedule: {result.schedule?.title ?? 'Unknown schedule'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return null
}
