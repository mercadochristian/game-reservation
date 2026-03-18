'use client'

import { MapPin, Clock, Calendar } from 'lucide-react'
import QRCode from 'react-qr-code'
import { type ScheduleWithLocation, type Registration } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { POSITION_LABELS } from '@/lib/constants/labels'
import { formatScheduleDate, formatScheduleTime } from '@/lib/utils/timezone'

interface QRModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: ScheduleWithLocation | null
  registration: Registration | null
}


export function QRModal({ open, onOpenChange, schedule, registration }: QRModalProps) {
  if (!schedule || !registration) return null

  const formattedDate = formatScheduleDate(schedule.start_time)
  const formattedStartTime = formatScheduleTime(schedule.start_time)
  const formattedEndTime = formatScheduleTime(schedule.end_time)

  const positionLabel =
    registration.preferred_position &&
    POSITION_LABELS[registration.preferred_position]
      ? POSITION_LABELS[registration.preferred_position]
      : 'Not specified'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{schedule.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                <p className="text-sm text-foreground">{(schedule.locations as any).name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="text-sm text-foreground">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</p>
                <p className="text-sm text-foreground">
                  {formattedStartTime} – {formattedEndTime}
                </p>
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="py-3 px-4 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Your Position</p>
            <p className="text-sm text-foreground">{positionLabel}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center py-6">
            {registration.qr_token ? (
              <div className="p-4 bg-white rounded-lg">
                <QRCode value={registration.qr_token} size={200} />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">QR code is being generated…</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <DialogPrimitive.Close render={<Button variant="outline" className="w-full" />}>
            Close
          </DialogPrimitive.Close>
        </div>
      </DialogContent>
    </Dialog>
  )
}
