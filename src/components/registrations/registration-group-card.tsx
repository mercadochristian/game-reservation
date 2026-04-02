'use client'

import { useState, useEffect } from 'react'
import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'
import { formatScheduleDateWithWeekday, formatScheduleTime } from '@/lib/utils/timezone'
import { POSITION_LABELS, SKILL_LEVEL_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/labels'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { POSITION_SLOTS, getPositionTotal, getPositionAvailable } from '@/lib/utils/position-slots'
import { RegistrationNoteDisplay } from './registration-note-display'

interface RegistrationGroupCardProps {
  schedule: ScheduleWithSlots
  registrations: RegistrationWithDetails[]
  isExpanded: boolean
  onToggleExpand: (scheduleId: string) => void
  isPastGame?: boolean
  onRegisterPlayer?: (scheduleId: string) => void
  onManageLineups?: (scheduleId: string) => void
}

/**
 * Renders a single game's collapsible section with its registrations table.
 * Shows game header with date, time, location, and registration count.
 * When expanded, displays a table with player registrations and optional action buttons.
 */
export function RegistrationGroupCard({
  schedule,
  registrations: initialRegistrations,
  isExpanded,
  onToggleExpand,
  isPastGame = false,
  onRegisterPlayer,
  onManageLineups,
}: RegistrationGroupCardProps) {
  const [positionCounts, setPositionCounts] = useState<Record<string, number>>({})
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>(initialRegistrations)

  useEffect(() => {
    if (!isExpanded || initialRegistrations.length === 0) return

    const fetchDetails = async () => {
      try {
        // Fetch position counts
        const posRes = await fetch(`/api/registrations/counts?schedule_ids=${schedule.id}`)
        if (posRes.ok) {
          const data = await posRes.json()
          setPositionCounts(data.positionCounts?.[schedule.id] || {})
        }

        // Fetch full registration details (users, payments, team info)
        const regRes = await fetch(`/api/admin/registrations/${schedule.id}`)
        if (regRes.ok) {
          const data = await regRes.json()
          setRegistrations(data.registrations || [])
        }
      } catch (err) {
        console.error('Failed to fetch schedule details:', err)
      }
    }

    fetchDetails()
  }, [isExpanded, schedule.id, initialRegistrations.length])
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

  const formatScheduleLabel = () => `${dateLabel} · ${timeLabel}`

  return (
    <div className={cn('border border-border rounded-lg bg-card overflow-hidden border-l-4 relative', isPastGame ? 'border-l-muted/40' : 'border-l-primary/60')}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary/60 to-primary/40"></div>
      {/* Header - Clickable to toggle expansion */}
      <button
        onClick={() => onToggleExpand(schedule.id)}
        aria-expanded={isExpanded}
        aria-label={`Expand/collapse registrations for ${locationName} on ${formatScheduleLabel()}`}
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
          {/* Available slots per position */}
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {POSITION_SLOTS.map((pos) => {
              const numTeams = Math.ceil(schedule.max_players / 6)
              const total = getPositionTotal(pos.key, numTeams)
              const registered = positionCounts[pos.key] ?? 0
              const available = getPositionAvailable(pos.key, numTeams, registered)
              return (
                <div key={pos.key} className="text-xs bg-muted/50 rounded p-2">
                  <div className="text-muted-foreground">{pos.label}</div>
                  <div className="font-semibold text-foreground">{available} / {total}</div>
                </div>
              )
            })}
          </div>

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
                      const playerName = reg.users
                        ? `${reg.users.first_name} ${reg.users.last_name}`
                        : 'Unknown Player'
                      const positionLabel = reg.preferred_position
                        ? POSITION_LABELS[reg.preferred_position]
                        : 'Not specified'
                      const skillLabel = reg.users && reg.users.skill_level
                        ? SKILL_LEVEL_LABELS[reg.users.skill_level] || 'Unknown'
                        : 'Unknown'
                      const lineupTeamName =
                        reg.team_members && reg.team_members.length > 0 && reg.team_members[0].teams
                          ? reg.team_members[0].teams.name
                          : '—'
                      const paymentStatus = (reg as any).payment_status || 'pending'
                      const isGrouped = (reg as any).is_grouped || false
                      const groupTeamName = (reg as any).team_name

                      return (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{playerName}</span>
                                {isGrouped && groupTeamName && (
                                  <Badge variant="secondary" className="text-xs">
                                    {groupTeamName}
                                  </Badge>
                                )}
                              </div>
                              <RegistrationNoteDisplay note={reg.registration_note} />
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{positionLabel}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{skillLabel}</TableCell>
                          <TableCell>
                            <Badge variant={getPaymentStatusVariant(paymentStatus)} className="text-xs">
                              {PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{lineupTeamName}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Manage Lineups — only when registrations exist */}
              {!isPastGame && (
                <div className="flex gap-2 mt-6 justify-end">
                  <Button variant="default" size="sm" onClick={() => onManageLineups?.(schedule.id)}>
                    Manage Lineups
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Register Player — always visible for upcoming games */}
          {!isPastGame && (
            <div className={`flex gap-2 justify-end ${registrations.length > 0 ? '' : 'mt-6'}`}>
              <Button variant="outline" size="sm" onClick={() => onRegisterPlayer?.(schedule.id)}>
                Register Player
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
