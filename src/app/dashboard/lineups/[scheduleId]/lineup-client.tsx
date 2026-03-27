'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'
import { ArrowLeft, Users, FileDown } from 'lucide-react'
import { motion } from 'framer-motion'
import type { RegistrationForLineup, ScheduleWithLocation } from '@/types'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'
import { saveLineupSchema } from '@/lib/validations/lineup'
import { LineupSheet } from './lineup-sheet'

type DraggableUnit = {
  unitId: string
  type: 'solo' | 'group'
  registrationIds: string[]
  players: Array<{
    registrationId: string
    name: string
    position: string | null
    skillLevel: string | null
    isGuest: boolean
  }>
  groupName?: string
}

type LineupState = {
  unassigned: DraggableUnit[]
  teams: Array<{
    name: string
    units: DraggableUnit[]
  }>
}

type DragItem = DraggableUnit | null

interface LineupClientProps {
  schedule: ScheduleWithLocation & { num_teams: number }
  registrations: RegistrationForLineup[]
  existingLineupTeams: Array<{ id: string; name: string }>
}

/**
 * Build draggable units from registrations
 * - Registrations sharing the same team_members.team_id → one group unit
 * - Registrations with no team_members → individual solo units
 */
function buildUnitsFromRegistrations(registrations: RegistrationForLineup[]): DraggableUnit[] {
  const units: DraggableUnit[] = []
  const groupedByTeam = new Map<string, RegistrationForLineup[]>()

  // Group registrations by team_id if they have team_members
  for (const reg of registrations) {
    if (reg.team_members && reg.team_members.length > 0) {
      const teamId = reg.team_members[0].team_id
      if (!groupedByTeam.has(teamId)) {
        groupedByTeam.set(teamId, [])
      }
      groupedByTeam.get(teamId)!.push(reg)
    }
  }

  // Create group units
  for (const [teamId, regs] of groupedByTeam) {
    const groupName = regs[0].team_members?.[0].teams?.name || 'Group'
    units.push({
      unitId: teamId,
      type: 'group',
      registrationIds: regs.map(r => r.id),
      players: regs.map(r => ({
        registrationId: r.id,
        name: `${r.users?.first_name || ''} ${r.users?.last_name || ''}`.trim(),
        position: r.preferred_position || null,
        skillLevel: r.users?.skill_level || null,
        isGuest: r.users?.is_guest || false,
      })),
      groupName,
    })
  }

  // Create solo units for registrations without team_members
  for (const reg of registrations) {
    if (!reg.team_members || reg.team_members.length === 0) {
      units.push({
        unitId: reg.id,
        type: 'solo',
        registrationIds: [reg.id],
        players: [
          {
            registrationId: reg.id,
            name: `${reg.users?.first_name || ''} ${reg.users?.last_name || ''}`.trim(),
            position: reg.preferred_position || null,
            skillLevel: reg.users?.skill_level || null,
            isGuest: reg.users?.is_guest || false,
          },
        ],
      })
    }
  }

  return units
}

/**
 * Initialize lineup state from registrations and existing lineup teams
 */
function initializeLineupState(
  registrations: RegistrationForLineup[],
  numTeams: number,
  existingLineupTeams: Array<{ id: string; name: string }>
): LineupState {
  const units = buildUnitsFromRegistrations(registrations)

  if (existingLineupTeams.length > 0) {
    // Load existing lineup
    const teams: LineupState['teams'] = existingLineupTeams.map(t => ({
      name: t.name,
      units: [],
    }))

    const unassigned: DraggableUnit[] = []

    for (const unit of units) {
      const assignedRegIds = unit.registrationIds
      const isAssigned = registrations.some(
        r => assignedRegIds.includes(r.id) && r.lineup_team_id
      )

      if (isAssigned) {
        const firstAssignedReg = registrations.find(
          r => assignedRegIds.includes(r.id) && r.lineup_team_id
        )
        const teamIndex = existingLineupTeams.findIndex(t => t.id === firstAssignedReg?.lineup_team_id)
        if (teamIndex >= 0) {
          teams[teamIndex].units.push(unit)
        } else {
          unassigned.push(unit)
        }
      } else {
        unassigned.push(unit)
      }
    }

    return { unassigned, teams }
  }

  // Create empty teams
  const teams: LineupState['teams'] = Array.from({ length: numTeams }, (_, i) => ({
    name: `Team ${i + 1}`,
    units: [],
  }))

  return {
    unassigned: units,
    teams,
  }
}

/**
 * Find which container (unassigned or team index) contains a unit
 */
function findContainerForUnit(state: LineupState, unitId: string): string | number | null {
  if (state.unassigned.some(u => u.unitId === unitId)) {
    return 'unassigned'
  }

  for (let i = 0; i < state.teams.length; i++) {
    if (state.teams[i].units.some(u => u.unitId === unitId)) {
      return i
    }
  }

  return null
}

/**
 * Move a unit from one container to another (immutable)
 */
function moveUnit(
  state: LineupState,
  unitId: string,
  sourceContainer: string | number | null,
  targetContainer: string | number | null
): LineupState {
  if (sourceContainer === targetContainer) return state

  let unit: DraggableUnit | undefined

  // Build new state immutably
  let newUnassigned = state.unassigned
  const newTeams = state.teams.map(t => ({ ...t, units: [...t.units] }))

  // Remove from source
  if (sourceContainer === 'unassigned') {
    unit = newUnassigned.find(u => u.unitId === unitId)
    newUnassigned = newUnassigned.filter(u => u.unitId !== unitId)
  } else if (typeof sourceContainer === 'number') {
    unit = newTeams[sourceContainer].units.find(u => u.unitId === unitId)
    newTeams[sourceContainer].units = newTeams[sourceContainer].units.filter(u => u.unitId !== unitId)
  }

  if (!unit) return state

  // Add to target
  if (targetContainer === 'unassigned') {
    newUnassigned = [...newUnassigned, unit]
  } else if (typeof targetContainer === 'number') {
    newTeams[targetContainer].units = [...newTeams[targetContainer].units, unit]
  }

  return { unassigned: newUnassigned, teams: newTeams }
}

/**
 * Helper to convert snake_case to Title Case
 */
function titleCase(s: string): string {
  return s
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Draggable unit card component
 */
function DraggableUnitCard({ unit }: { unit: DraggableUnit }) {
  if (unit.type === 'solo') {
    const player = unit.players[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow">
        <div className="font-medium text-sm text-gray-900">{player.name}</div>
        <div className="flex gap-2 text-xs text-gray-500 mt-1">
          {player.position && <span>{titleCase(player.position)}</span>}
          {player.position && player.skillLevel && <span>·</span>}
          {player.skillLevel && <span>{titleCase(player.skillLevel)}</span>}
        </div>
        {player.isGuest && (
          <Badge variant="outline" className="text-xs mt-2">
            Guest
          </Badge>
        )}
      </div>
    )
  }

  // Group card
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow">
      <div className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
        <Users size={14} />
        {unit.groupName}
        <Badge variant="secondary" className="text-xs">
          {unit.players.length} players
        </Badge>
      </div>
      <div className="space-y-2">
        {unit.players.map(player => (
          <div key={player.registrationId}>
            <div className="text-xs text-blue-800 ml-2">
              • {player.name}
              {player.isGuest && ' (Guest)'}
            </div>
            <div className="flex gap-2 text-xs text-blue-600 ml-4 mt-0.5">
              {player.position && <span>{titleCase(player.position)}</span>}
              {player.position && player.skillLevel && <span>·</span>}
              {player.skillLevel && <span>{titleCase(player.skillLevel)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Droppable zone wrapper
 */
function DroppableZone({
  id,
  children,
  isDragOver,
}: {
  id: string
  children: React.ReactNode
  isDragOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-24 transition-all rounded-md ${
        isDragOver ? 'bg-primary/10 ring-2 ring-primary ring-dashed' : ''
      }`}
    >
      {children}
    </div>
  )
}

/**
 * Draggable card wrapper
 */
function DraggableCard({ unit }: { unit: DraggableUnit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: unit.unitId,
  })
  const [showFaded, setShowFaded] = useState(false)

  useEffect(() => {
    if (isDragging) {
      setShowFaded(true)
    } else {
      // Delay showing full opacity until animation settles
      const timer = setTimeout(() => setShowFaded(false), 100)
      return () => clearTimeout(timer)
    }
  }, [isDragging])

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`transition-opacity duration-200 ${showFaded ? 'opacity-40' : 'opacity-100'}`}
    >
      <DraggableUnitCard unit={unit} />
    </div>
  )
}

/**
 * Team column component
 */
function TeamColumn({
  teamIndex,
  teamName,
  units,
  onNameChange,
  isDragOver,
}: {
  teamIndex: number
  teamName: string
  units: DraggableUnit[]
  onNameChange: (name: string) => void
  isDragOver: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(teamName)

  const handleSaveTeamName = () => {
    onNameChange(editingName || teamName)
    setIsEditing(false)
  }

  const droppableId = `team-${teamIndex}`

  return (
    <motion.div
      className={`shrink-0 w-80 bg-card border-2 rounded-lg p-4 transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
      custom={teamIndex}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: teamIndex * 0.1 }}
    >
      {isEditing ? (
        <input
          type="text"
          value={editingName}
          onChange={e => setEditingName(e.target.value)}
          onBlur={handleSaveTeamName}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSaveTeamName()
            if (e.key === 'Escape') {
              setEditingName(teamName)
              setIsEditing(false)
            }
          }}
          autoFocus
          className="w-full px-2 py-1 text-lg font-semibold border border-primary rounded mb-4"
        />
      ) : (
        <h3
          onClick={() => setIsEditing(true)}
          className="text-lg font-semibold text-foreground mb-4 cursor-pointer hover:text-primary"
        >
          {teamName}
          <Badge variant="secondary" className="ml-2 text-xs">
            {units.reduce((sum, u) => sum + u.players.length, 0)}
          </Badge>
        </h3>
      )}

      <DroppableZone id={droppableId} isDragOver={isDragOver}>
        {units.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Drop players here
          </div>
        ) : (
          <div className="space-y-2">
            {units.map(unit => (
              <DraggableCard key={unit.unitId} unit={unit} />
            ))}
          </div>
        )}
      </DroppableZone>
    </motion.div>
  )
}

/**
 * Main lineup client component
 */
export function LineupClient({
  schedule,
  registrations,
  existingLineupTeams,
}: LineupClientProps) {
  const router = useRouter()
  const params = useParams()
  const scheduleId = params.scheduleId as string

  const [state, setState] = useState<LineupState>(() =>
    initializeLineupState(registrations, schedule.num_teams, existingLineupTeams)
  )

  const [draggedUnit, setDraggedUnit] = useState<DragItem>(null)
  const [saving, setSaving] = useState(false)
  const [dragOverContainer, setDragOverContainer] = useState<string | number | null>(null)
  const lineupSheetRef = useRef<{ downloadPng: () => Promise<void> }>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const allUnits = [
        ...state.unassigned,
        ...state.teams.flatMap(t => t.units),
      ]
      const unit = allUnits.find(u => u.unitId === event.active.id)
      setDraggedUnit(unit ?? null)
    },
    [state]
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id
    if (!overId) {
      setDragOverContainer(null)
      return
    }
    if (overId === 'unassigned') {
      setDragOverContainer('unassigned')
      return
    }
    if (typeof overId === 'string' && overId.startsWith('team-')) {
      setDragOverContainer(parseInt(overId.split('-')[1], 10))
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setDragOverContainer(null)

      if (!over || !draggedUnit) {
        setDraggedUnit(null)
        return
      }

      const sourceContainer = findContainerForUnit(state, draggedUnit.unitId)
      const targetContainer = over.id
      const targetIndex =
        typeof targetContainer === 'string' && targetContainer.startsWith('team-')
          ? parseInt(targetContainer.split('-')[1], 10)
          : targetContainer

      setState(prev => moveUnit(prev, draggedUnit.unitId, sourceContainer, targetIndex))
      setDraggedUnit(null)
    },
    [state, draggedUnit]
  )

  const handleTeamNameChange = useCallback((teamIndex: number, newName: string) => {
    setState(prev => {
      const next = { ...prev }
      next.teams[teamIndex].name = newName.slice(0, 60)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Build assignments from current state
      const assignments: Array<{
        registration_id: string
        team_index: number | null
      }> = []

      // Add unassigned
      for (const unit of state.unassigned) {
        for (const regId of unit.registrationIds) {
          assignments.push({
            registration_id: regId,
            team_index: null,
          })
        }
      }

      // Add assigned
      for (let i = 0; i < state.teams.length; i++) {
        for (const unit of state.teams[i].units) {
          for (const regId of unit.registrationIds) {
            assignments.push({
              registration_id: regId,
              team_index: i,
            })
          }
        }
      }

      const payload = {
        schedule_id: scheduleId,
        teams: state.teams.map(t => ({ name: t.name })),
        assignments,
      }

      // Validate with schema
      const validated = saveLineupSchema.parse(payload)

      const res = await fetch('/api/admin/lineups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save lineup')
      }

      toast.success('Lineup saved successfully!')
      router.refresh()
      router.back()
    } catch (err) {
      toast.error('Failed to save lineup', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSaving(false)
    }
  }, [state, scheduleId, router])

  const totalPlayers = state.unassigned.reduce((sum, u) => sum + u.registrationIds.length, 0) +
    state.teams.reduce((sum, team) =>
      sum + team.units.reduce((unitSum, u) => unitSum + u.registrationIds.length, 0), 0
    )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.back()}
                  className="h-8 w-8"
                >
                  <ArrowLeft size={16} />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Set Lineup</h1>
                  <p className="text-sm text-muted-foreground">{formatScheduleLabel(schedule)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {totalPlayers} players registered
                </div>
                {existingLineupTeams.length > 0 && (
                  <Button
                    onClick={() => lineupSheetRef.current?.downloadPng()}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FileDown size={16} />
                    Download Lineup Sheet
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? 'Saving...' : 'Save Lineup'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex gap-4 p-4 overflow-x-auto max-h-[calc(100vh-120px)]">
          {/* Unassigned pool */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 w-72 bg-card border-2 border-border rounded-lg p-4"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              Unassigned
              <Badge variant="outline">{state.unassigned.reduce((sum, u) => sum + u.registrationIds.length, 0)}</Badge>
            </h2>

            <DroppableZone id="unassigned" isDragOver={dragOverContainer === 'unassigned'}>
              {state.unassigned.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  All players assigned!
                </div>
              ) : (
                <div className="space-y-2">
                  {state.unassigned.map(unit => (
                    <DraggableCard key={unit.unitId} unit={unit} />
                  ))}
                </div>
              )}
            </DroppableZone>
          </motion.div>

          {/* Team columns */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-4 overflow-x-auto pb-4"
          >
            {state.teams.map((team, index) => (
              <TeamColumn
                key={index}
                teamIndex={index}
                teamName={team.name}
                units={team.units}
                onNameChange={name => handleTeamNameChange(index, name)}
                isDragOver={dragOverContainer === index}
              />
            ))}
          </motion.div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedUnit ? (
            <motion.div
              className="cursor-grabbing drop-shadow-lg"
              initial={{ scale: 1 }}
              animate={{ scale: 1.04, rotate: 2 }}
              transition={{ duration: 0.15 }}
            >
              <DraggableUnitCard unit={draggedUnit} />
            </motion.div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Lineup Sheet (rendered but invisible, used for image generation) */}
      <div className="absolute opacity-0 pointer-events-none top-0 left-0 w-full">
        <LineupSheet
          ref={lineupSheetRef}
          schedule={schedule}
          registrations={registrations}
          lineupTeams={existingLineupTeams}
          scheduleId={scheduleId}
        />
      </div>
    </DndContext>
  )
}
