'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import type { RegistrationForLineup, ScheduleWithLocation } from '@/types'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'

const TEAM_COLORS = ['bg-pink-100', 'bg-green-100', 'bg-yellow-100', 'bg-blue-100']

function titleCase(s: string): string {
  return s
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function capitalizeGender(gender: string | null): string {
  if (!gender) return ''
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()
}

interface LineupSheetProps {
  readonly schedule: ScheduleWithLocation & { num_teams: number }
  readonly registrations: RegistrationForLineup[]
  readonly lineupTeams: Array<{ id: string; name: string }>
  readonly scheduleId: string
}

export const LineupSheet = forwardRef<{ downloadPng: () => Promise<void> }, LineupSheetProps>(
  function LineupSheet(
    {
      schedule,
      registrations,
      lineupTeams,
      scheduleId,
    }: LineupSheetProps,
    ref
  ) {
    const tableRef = useRef<HTMLDivElement>(null)

    // Build rows sorted by team
    const rows = registrations.map(reg => {
      // Determine registration type: solo, group, or team
      let registrationType = 'solo'
      if (reg.team_members && reg.team_members.length > 0) {
        // For now, treat all team_members registrations as "group"
        // If "team" is a separate concept, it would come from registration_payments table
        registrationType = 'group'
      }

      return {
        reg,
        teamName:
          lineupTeams.find(t => t.id === reg.lineup_team_id)?.name || 'Unassigned',
        teamIndex: lineupTeams.findIndex(t => t.id === reg.lineup_team_id),
        registrationType,
      }
    })

    // Sort: unassigned last, then by team order
    const sortedRows = rows.toSorted((a, b) => {
      if (a.reg.lineup_team_id === null && b.reg.lineup_team_id !== null) return 1
      if (a.reg.lineup_team_id !== null && b.reg.lineup_team_id === null) return -1

      // Handle team index comparison
      if (a.teamIndex !== b.teamIndex) {
        const aIsUnassigned = a.teamIndex === -1
        const bIsUnassigned = b.teamIndex === -1
        if (aIsUnassigned) return 1
        if (bIsUnassigned) return -1
        return a.teamIndex - b.teamIndex
      }

      return 0
    })

    async function downloadPng() {
      if (!tableRef.current) return

      try {
        const dataUrl = await toPng(tableRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        })
        const link = document.createElement('a')
        link.download = `lineup-${scheduleId}.png`
        link.href = dataUrl
        link.click()
        toast.success('Lineup sheet downloaded')
      } catch (error) {
        console.error('Failed to generate PNG:', error)
        toast.error('Failed to download lineup sheet')
      }
    }

    useImperativeHandle(ref, () => ({
      downloadPng,
    }))

    return (
      <div className="space-y-4">
        <div ref={tableRef} className="bg-white p-8">
          {/* Header */}
          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-black text-black">
              Line-up for Game Schedule, {formatScheduleLabel(schedule)}
            </h2>
            <p className="text-sm text-gray-800 font-semibold">
              {schedule.locations.name} • {schedule.locations.address}
            </p>
          </div>

          {/* Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-4 border-gray-900">
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  First Timer?
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  First Name
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Last Name
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Gender
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Skill Level
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Position
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Team
                </th>
                <th className="border-2 border-gray-900 px-3 py-3 text-left font-black bg-gray-300 text-black">
                  Registration Type
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => {
                const colorIndex = row.teamIndex === -1 ? 0 : row.teamIndex % TEAM_COLORS.length
                const bgColor = TEAM_COLORS[colorIndex]

                return (
                  <tr
                    key={row.reg.id}
                    className={`border-b-2 border-gray-700 text-gray-900 ${bgColor}`}
                  >
                    <td className="border-2 border-gray-700 px-3 py-2 font-medium">
                      {row.reg.users?.is_guest ? "Yes, I'm a First-Timer" : "No, I'm a Returnee"}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2 font-medium">
                      {row.reg.users?.first_name || ''}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2 font-medium">
                      {row.reg.users?.last_name || ''}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2">
                      {capitalizeGender(row.reg.users?.gender || '')}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2">
                      {row.reg.users?.skill_level ? titleCase(row.reg.users.skill_level) : ''}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2">
                      {row.reg.preferred_position ? titleCase(row.reg.preferred_position) : ''}
                    </td>
                    <td className="border-2 border-gray-700 px-3 py-2 font-medium">{row.teamName}</td>
                    <td className="border-2 border-gray-700 px-3 py-2">{titleCase(row.registrationType)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
)
