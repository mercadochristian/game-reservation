'use client'

import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'
import { POSITION_LABELS, SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RegistrationGroupCardProps {
  schedule: ScheduleWithSlots
  registrations: RegistrationWithDetails[]
  isExpanded: boolean
  onToggleExpand: (scheduleId: string) => void
  isPastGame?: boolean
}

/**
 * Renders a single game's collapsible section with its registrations table.
 * Shows game header with date, time, location, and registration count.
 * When expanded, displays a table with player registrations and optional action buttons.
 */
export function RegistrationGroupCard({
  schedule,
  registrations,
  isExpanded,
  onToggleExpand,
  isPastGame = false,
}: RegistrationGroupCardProps) {
  const dateLabel = formatScheduleDateWithWeekday(schedule.start_time)
  const timeLabel = formatScheduleTime(schedule.start_time)
  const locationName = schedule.locations?.name || 'Unknown Location'

  const getPaymentStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (status) {
      case 'pending':
        return 'outline'
      case 'review':
        return 'secondary'
      case 'paid':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className={cn('border border-border rounded-lg bg-card overflow-hidden border-l-4', isPastGame ? 'border-l-muted/40' : 'border-l-primary/60')}>
      {/* Header - Clickable to toggle expansion */}
      <button
        onClick={() => onToggleExpand(schedule.id)}
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

        {/* Registration count badge */}
        <Badge variant="secondary" className="shrink-0 ml-4">
          {schedule.registration_count}
        </Badge>
      </button>

      {/* Expanded content - Registrations table */}
      {isExpanded && (
        <div className="border-t border-border px-6 py-4">
          {registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No registrations yet</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="hidden sm:table-cell">Position</TableHead>
                      <TableHead className="hidden sm:table-cell">Skill Level</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="hidden lg:table-cell">Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => {
                      const playerName = `${reg.users.first_name} ${reg.users.last_name}`
                      const positionLabel = reg.preferred_position
                        ? POSITION_LABELS[reg.preferred_position]
                        : 'Not specified'
                      const skillLabel = SKILL_LEVEL_LABELS[reg.users.skill_level] || 'Unknown'
                      const teamName =
                        reg.team_members && reg.team_members.length > 0 && reg.team_members[0].teams
                          ? reg.team_members[0].teams.name
                          : '—'
                      const paymentStatus = (reg as any).payment_status || 'pending'

                      return (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">{playerName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{positionLabel}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{skillLabel}</TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusVariant(paymentStatus)} className="text-xs">
                              {paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{teamName}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Action buttons - Only show for upcoming games */}
              {!isPastGame && (
                <div className="flex gap-2 mt-6 justify-end">
                  <Button variant="outline" size="sm">
                    Register Player
                  </Button>
                  <Button variant="default" size="sm">
                    Manage Lineups
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
