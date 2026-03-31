'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { RegistrationGroupCard } from './registration-group-card'
import { Pagination } from '@/components/ui/pagination'
import type { ScheduleWithSlots, RegistrationWithDetails } from '@/types'

interface PastGamesSectionProps {
  schedules: ScheduleWithSlots[]
  registrationsByScheduleId: Record<string, RegistrationWithDetails[]>
  expandedScheduleIds: Set<string>
  isExpanded: boolean
  onToggleSectionExpand: () => void
  onToggleGameExpand: (scheduleId: string) => void
  onRegisterPlayer: (scheduleId: string) => void
  onManageLineups: (scheduleId: string) => void
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PastGamesSection({
  schedules,
  registrationsByScheduleId,
  expandedScheduleIds,
  isExpanded,
  onToggleSectionExpand,
  onToggleGameExpand,
  onRegisterPlayer,
  onManageLineups,
  currentPage,
  pageSize,
  onPageChange,
}: PastGamesSectionProps) {
  const paginatedSchedules = schedules.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggleSectionExpand}
        className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4 hover:text-primary transition-colors cursor-pointer"
      >
        {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
        <span>PAST GAMES</span>
        <span className="text-primary">({schedules.length})</span>
      </button>

      {/* Content (shown when expanded) */}
      {isExpanded && (
        <>
          {schedules.length === 0 ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No past games at this location.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {paginatedSchedules.map((schedule) => (
                  <RegistrationGroupCard
                    key={schedule.id}
                    schedule={schedule}
                    registrations={registrationsByScheduleId[schedule.id] || []}
                    isExpanded={expandedScheduleIds.has(schedule.id)}
                    onToggleExpand={onToggleGameExpand}
                    isPastGame={true}
                    onRegisterPlayer={onRegisterPlayer}
                    onManageLineups={onManageLineups}
                  />
                ))}
              </div>

              {schedules.length > pageSize && (
                <Pagination
                  currentPage={currentPage}
                  totalCount={schedules.length}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                  onPageSizeChange={() => {}}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
