'use client'

import { useEffect, useState } from 'react'
import { type ScheduleWithLocation } from '@/types'
import { POSITION_LABELS } from '@/lib/constants/labels'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'


interface PositionModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly schedule: ScheduleWithLocation | null
  readonly position: string | null
  readonly totalSlots: number
  readonly registeredCount: number
}

export function PositionModal({
  open,
  onOpenChange,
  schedule,
  position,
  totalSlots,
  registeredCount,
}: PositionModalProps) {
  const [players, setPlayers] = useState<Array<{ first_name: string | null; last_name: string | null }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !schedule || !position) return

    setLoading(true)
    fetch(`/api/registrations/by-position?schedule_id=${schedule.id}&position=${position}`)
      .then((res) => res.json())
      .then((data: Array<{ first_name: string | null; last_name: string | null }>) => {
        setPlayers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('[PositionModal] Failed to fetch registered players:', err)
        setPlayers([])
        setLoading(false)
      })
  }, [open, schedule, position])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setTimeout(() => {
        setPlayers([])
        setLoading(false)
      }, 200)
    }
  }

  if (!schedule || !position) return null

  const positionLabel = POSITION_LABELS[position] ?? position
  const available = Math.max(0, totalSlots - registeredCount)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{positionLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fill bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {registeredCount} of {totalSlots} filled
              </span>
              <span
                className={
                  available <= 0
                    ? 'text-destructive font-medium'
                    : 'text-muted-foreground'
                }
              >
                {available <= 0 ? 'Full' : `${available} available`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min((registeredCount / totalSlots) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Player list */}
          <div className="space-y-0 min-h-[60px]">
            {loading ? (
              <p className="text-sm text-muted-foreground py-2">Loading…</p>
            ) : players.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No players registered for this position yet.
              </p>
            ) : (
              players.map((p, i) => (
                <div
                  key={`${p.first_name ?? ''}-${p.last_name ?? ''}-${i}`}
                  className="flex items-center py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm">
                    {p.first_name} {p.last_name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
