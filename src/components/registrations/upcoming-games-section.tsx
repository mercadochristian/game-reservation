'use client'

import { RegistrationGroupCard } from './registration-group-card'
import { Pagination } from '@/components/ui/pagination'
import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'

interface UpcomingGamesSectionProps {
  schedules: ScheduleWithSlots[]
  registrationsByScheduleId: Record<string, RegistrationWithDetails[]>
  expandedScheduleIds: Set<string>
  onToggleExpand: (scheduleId: string) => void
  onRegisterPlayer: (scheduleId: string) => void
  onManageLineups: (scheduleId: string) => void
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function UpcomingGamesSection({
  schedules,
  registrationsByScheduleId,
  expandedScheduleIds,
  onToggleExpand,
  onRegisterPlayer,
  onManageLineups,
  currentPage,
  pageSize,
  onPageChange,
}: UpcomingGamesSectionProps) {
  const paginatedSchedules = schedules.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        UPCOMING GAMES <span className="text-primary">({schedules.length})</span>
      </h2>

      {schedules.length === 0 ? (
        <div className="bg-card border-border border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No upcoming games at this location.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedSchedules.map((schedule) => (
              <RegistrationGroupCard
                key={schedule.id}
                schedule={schedule}
                registrations={registrationsByScheduleId[schedule.id] || []}
                isExpanded={expandedScheduleIds.has(schedule.id)}
                onToggleExpand={onToggleExpand}
                isPastGame={false}
                onRegisterPlayer={onRegisterPlayer}
                onManageLineups={onManageLineups}
              />
            ))}
          </div>

          {schedules.length > pageSize && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalCount={schedules.length}
                pageSize={pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={() => {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
