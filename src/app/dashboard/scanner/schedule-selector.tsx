'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toManilaDateKey, formatScheduleTime } from '@/lib/utils/timezone'
import type { ScannerSchedule } from '@/lib/hooks/useSchedulesForScanner'

interface ScheduleSelectorProps {
  schedules: ScannerSchedule[]
  selectedScheduleId: string | null
  onSelectSchedule: (scheduleId: string) => void
  isLoading: boolean
  error: string | null
}

export function ScheduleSelector({
  schedules,
  selectedScheduleId,
  onSelectSchedule,
  isLoading,
  error,
}: ScheduleSelectorProps) {
  // Auto-select if exactly one schedule is available
  useEffect(() => {
    if (schedules.length === 1 && !selectedScheduleId) {
      onSelectSchedule(schedules[0].id)
    }
  }, [schedules, selectedScheduleId, onSelectSchedule])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Schedule</CardTitle>
        <CardDescription>Choose a game to scan attendance for</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 text-red-600 rounded-lg text-sm">{error}</div>
        ) : schedules.length === 0 ? (
          <div className="p-4 bg-muted text-muted-foreground rounded-lg text-sm">
            No schedules found for the selected filters.
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => {
              const isSelected = selectedScheduleId === schedule.id
              const scheduleDate = toManilaDateKey(schedule.start_time)
              const scheduleTime = formatScheduleTime(schedule.start_time)

              return (
                <button
                  key={schedule.id}
                  onClick={() => onSelectSchedule(schedule.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{schedule.location.name}</span>
                        {isSelected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {scheduleTime}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          {schedule.registered_count}/{schedule.max_players} registered
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {schedule.attended_count} attended
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <span className="text-primary-foreground text-sm">✓</span>}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
