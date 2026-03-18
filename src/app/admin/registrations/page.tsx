'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Trash2, X, ChevronDown, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { createClient } from '@/lib/supabase/client'
import { adminRegistrationSchema } from '@/lib/validations/admin-registration'
import { groupPlayerSchema } from '@/lib/validations/group-registration'
import type { RegistrationWithDetails, ScheduleWithSlots, PaymentStatus } from '@/types'
import { ScheduleInfo } from '@/components/schedule-info'
import { fadeUpVariants } from '@/lib/animations'
import { POSITION_LABELS, SKILL_LEVEL_LABELS } from '@/lib/constants/labels'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { formatScheduleDateTime, formatScheduleTime } from '@/lib/utils/timezone'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'

const PAYMENT_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  review: 'secondary',
  paid: 'default',
  rejected: 'destructive',
}

type RegistrationMode = 'single' | 'group' | 'team'

type AdminPlayerEntry =
  | { type: 'existing'; user_id: string; display_name: string; preferred_position: string }
  | { type: 'guest'; first_name: string; last_name: string; email: string; phone: string; preferred_position: string }
  | { type: 'empty' }

type SearchUser = { id: string; first_name: string | null; last_name: string | null; email: string; skill_level: string | null }

const DEFAULT_PAGE_SIZE = 15

export default function RegistrationsPage() {
  const supabase = createClient()

  // --- Filter state ---
  const [filterDate, setFilterDate] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  // --- Schedules state ---
  const [schedules, setSchedules] = useState<ScheduleWithSlots[]>([])
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [loadingSchedules, setLoadingSchedules] = useState(true)

  // --- Registrations state ---
  const [registrations, setRegistrations] = useState<RegistrationWithDetails[]>([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // --- Register dialog ---
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>('single')
  const [players, setPlayers] = useState<AdminPlayerEntry[]>([{ type: 'empty' }])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [submitting, setSubmitting] = useState(false)

  // --- Player search ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- Player detail dialog ---
  const [selectedPlayer, setSelectedPlayer] = useState<RegistrationWithDetails | null>(null)

  // Load schedules on mount and when filter changes
  useEffect(() => {
    const loadSchedules = async () => {
      setLoadingSchedules(true)
      try {
        const client = createClient()
        let query = client
          .from('schedules')
          .select('id, title, start_time, end_time, max_players, status, locations!inner(id, name), registrations(count)')

        // Filter by date if provided
        if (filterDate) {
          const startOfDay = new Date(filterDate + 'T00:00:00+08:00').toISOString()
          const endOfDay = new Date(filterDate + 'T23:59:59+08:00').toISOString()
          query = query.gte('start_time', startOfDay).lte('start_time', endOfDay)
        }

        query = query.order('start_time', { ascending: true })

        const { data, error } = await query

        if (error) {
          console.error('[Registrations] Failed to load schedules:', error)
          toast.error('Failed to load schedules', { description: getUserFriendlyMessage(error) })
        } else {
          const schedulesWithCounts: ScheduleWithSlots[] = (data || []).map((s: any) => ({
            ...s,
            registration_count: s.registrations?.[0]?.count ?? 0,
          }))
          setSchedules(schedulesWithCounts)
        }
      } finally {
        setLoadingSchedules(false)
      }
    }

    loadSchedules()
  }, [filterDate])

  // Load registrations when schedule is selected
  useEffect(() => {
    if (!selectedScheduleId) {
      setRegistrations([])
      return
    }

    const loadRegistrations = async () => {
      setLoadingRegistrations(true)
      try {
        const client = createClient()
        const { data, error } = await client
          .from('registrations')
          .select(`
            id, schedule_id, player_id, registered_by, team_preference,
            payment_status, attended, preferred_position, created_at,
            users!player_id(id, first_name, last_name, email, skill_level, is_guest),
            team_members!registration_id(team_id, teams(id, name))
          `)
          .eq('schedule_id', selectedScheduleId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('[Registrations] Failed to load registrations:', error)
          toast.error('Failed to load registrations', { description: getUserFriendlyMessage(error) })
        } else {
          setRegistrations((data || []) as RegistrationWithDetails[])
          setCurrentPage(1)
        }
      } finally {
        setLoadingRegistrations(false)
      }
    }

    loadRegistrations()
  }, [selectedScheduleId])

  // Debounced player search
  const handlePlayerSearch = useCallback(async (query: string) => {
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const handleRegisterDialogOpen = () => {
    setRegistrationMode('single')
    setPlayers([{ type: 'empty' }])
    setPaymentStatus('pending')
    setRegisterDialogOpen(true)
  }

  const handleRegisterDialogClose = () => {
    setRegisterDialogOpen(false)
    setPlayers([{ type: 'empty' }])
    setPaymentStatus('pending')
    setSearchResults([])
    setSearchQuery('')
  }

  const handleAddPlayer = () => {
    setPlayers([...players, { type: 'empty' }])
  }

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const handlePlayerTypeChange = (index: number, type: 'existing' | 'guest') => {
    setPlayers(players.map((p, i) =>
      i === index
        ? type === 'existing'
          ? { type: 'existing', user_id: '', display_name: '', preferred_position: '' }
          : { type: 'guest', first_name: '', last_name: '', email: '', phone: '', preferred_position: '' }
        : p
    ))
  }

  const handleSelectExistingPlayer = (index: number, user: SearchUser) => {
    setPlayers(players.map((p, i) =>
      i === index
        ? {
            type: 'existing',
            user_id: user.id,
            display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            preferred_position: '',
          }
        : p
    ))
    setSearchResults([])
    setSearchQuery('')
  }

  const handlePlayerFieldChange = (index: number, field: string, value: string) => {
    setPlayers(players.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ))
  }

  const handleSubmitRegistration = async () => {
    if (!selectedScheduleId) {
      toast.error('No schedule selected')
      return
    }

    // Filter out empty entries and validate
    const validPlayers = players.filter((p): p is Exclude<AdminPlayerEntry, { type: 'empty' }> => p.type !== 'empty')
    if (validPlayers.length === 0) {
      toast.error('Please add at least one player')
      return
    }

    // Check all players have positions selected
    if (validPlayers.some((p) => !p.preferred_position)) {
      toast.error('All players must have a position selected')
      return
    }

    // Build request payload
    const playerPayload = validPlayers.map((p) => {
      if (p.type === 'existing') {
        return {
          type: 'existing',
          user_id: p.user_id,
          preferred_position: p.preferred_position,
        }
      } else {
        return {
          type: 'guest',
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          phone: p.phone || undefined,
          preferred_position: p.preferred_position,
        }
      }
    })

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_id: selectedScheduleId,
          registration_mode: registrationMode,
          payment_status: paymentStatus,
          team_preference: registrationMode === 'single' ? 'shuffle' : 'teammate',
          players: playerPayload,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      toast.success(`${validPlayers.length} player${validPlayers.length > 1 ? 's' : ''} registered successfully`)
      handleRegisterDialogClose()

      // Refetch registrations and schedules
      const { data: regs } = await supabase
        .from('registrations')
        .select(`
          id, schedule_id, player_id, registered_by, team_preference,
          payment_status, attended, preferred_position, created_at,
          users!player_id(id, first_name, last_name, email, skill_level, is_guest),
          team_members!player_id(team_id, teams(id, name))
        `)
        .eq('schedule_id', selectedScheduleId)
        .order('created_at', { ascending: true })

      setRegistrations((regs || []) as RegistrationWithDetails[])

      // Refetch schedules to update slot counts
      let query = supabase
        .from('schedules')
        .select('id, title, start_time, end_time, max_players, status, locations!inner(id, name), registrations(count)')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      const { data: updatedSchedules } = await query
      if (updatedSchedules) {
        const schedulesWithCounts = (updatedSchedules || []).map((s: any) => ({
          ...s,
          registration_count: s.registrations?.[0]?.count ?? 0,
        }))
        setSchedules(schedulesWithCounts)
      }
    } catch (error) {
      console.error('[Registrations] Registration failed:', error)
      toast.error('Failed to register players', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId)
  const selectedScheduleIsPast = selectedSchedule
    ? new Date(selectedSchedule.start_time) < new Date()
    : false
  const paginatedRegistrations = registrations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Registrations</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Registrations</h1>
                <Badge variant="outline" className="text-xs">
                  {registrations.length}
                </Badge>
              </div>
              <p className="text-muted-foreground">View and manage player registrations</p>
            </div>
          </div>
        </motion.div>

        {/* Filter Accordion */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg mb-6 overflow-hidden">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Calendar size={16} />
              {filterDate ? `Showing: ${filterDate}` : 'Filter by Date'}
            </span>
            <ChevronDown size={16} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-2 flex items-end gap-3 border-t border-border">
                  <div className="flex-1">
                    <Label className="text-xs font-medium mb-1 block">Date</Label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {filterDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterDate('')}
                      className="gap-1"
                    >
                      <X size={14} />
                      Clear
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Schedules Section */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-foreground">Games</h2>

          {loadingSchedules ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-card border-border border rounded-lg p-8 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">No games found.</p>
              <p className="text-sm text-muted-foreground">Adjust your date filter to see available games.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => {
                const available = schedule.max_players - schedule.registration_count
                const isSelected = schedule.id === selectedScheduleId
                return (
                  <div
                    key={schedule.id}
                    className={`bg-card border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="mb-2">
                      <ScheduleInfo schedule={schedule} />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">{available}</span>
                        <span className="text-muted-foreground"> / {schedule.max_players} slots</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                    >
                      {isSelected ? 'Selected' : 'View Registrations'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Registrations Section */}
        {selectedSchedule && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Registrations for: <span className="text-primary">{formatScheduleLabel(selectedSchedule)}</span>
              </h2>
              {!selectedScheduleIsPast && (
                <Button onClick={handleRegisterDialogOpen} className="gap-2" size="sm">
                  <Plus size={16} />
                  Register a Player
                </Button>
              )}
            </div>

            <div className="bg-card border-border border rounded-lg overflow-hidden">
              {loadingRegistrations ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Player</TableHead>
                      <TableHead className="hidden sm:table-cell">Position</TableHead>
                      <TableHead className="hidden md:table-cell">Team</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="hidden md:table-cell">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                            <div className="h-3 bg-muted/50 rounded w-32 animate-pulse" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : registrations.length === 0 ? (
                <div className="p-12 text-center">
                  <Search size={48} className="mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-4">No registrations yet for this schedule.</p>
                  {!selectedScheduleIsPast && (
                    <Button onClick={handleRegisterDialogOpen} variant="outline" className="gap-2">
                      <Plus size={18} />
                      Register First Player
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Player</TableHead>
                      <TableHead className="hidden sm:table-cell">Position</TableHead>
                      <TableHead className="hidden md:table-cell">Team</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="hidden md:table-cell">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRegistrations.map((reg) => (
                      <TableRow key={reg.id} className="border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedPlayer(reg)}>
                        <TableCell className="py-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">
                                {reg.users?.first_name} {reg.users?.last_name}
                              </span>
                              {reg.users?.is_guest && (
                                <Badge variant="outline" className="text-xs">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {reg.team_members?.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {reg.team_members[0].teams?.name ?? 'Group'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground truncate mt-1">
                              {reg.users?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {reg.preferred_position ? POSITION_LABELS[reg.preferred_position] : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {reg.team_preference === 'teammate' ? 'With Teammates' : 'Shuffle'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={PAYMENT_BADGE_VARIANTS[reg.payment_status]} className="whitespace-nowrap">
                            {reg.payment_status.charAt(0).toUpperCase() + reg.payment_status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {registrations.length > 0 && (
              <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUpVariants} className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalCount={registrations.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {!selectedSchedule && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg p-12 text-center">
            <Calendar size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a schedule above to view its registrations</p>
          </motion.div>
        )}
      </div>

      {/* Player Detail Dialog */}
      {selectedPlayer && (() => {
        const teammates = selectedPlayer?.team_members?.[0]?.team_id
          ? registrations.filter(r =>
              r.id !== selectedPlayer.id &&
              r.team_members?.[0]?.team_id === selectedPlayer.team_members[0].team_id
            )
          : []
        return (
          <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) setSelectedPlayer(null) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Player Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Player info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {selectedPlayer.users?.first_name} {selectedPlayer.users?.last_name}
                    </span>
                    {selectedPlayer.users?.is_guest && <Badge variant="outline">Guest</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedPlayer.users?.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Preferred Position</p>
                    <p className="text-sm font-medium">
                      {selectedPlayer.preferred_position
                        ? POSITION_LABELS[selectedPlayer.preferred_position]
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Skill Level</p>
                    <p className="text-sm font-medium">
                      {selectedPlayer.users?.skill_level
                        ? SKILL_LEVEL_LABELS[selectedPlayer.users.skill_level]
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Teammates section */}
                {teammates.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                      Teammates — {selectedPlayer.team_members?.[0]?.teams?.name ?? 'Team'}
                    </p>
                    <div className="space-y-2">
                      {teammates.map((tm) => (
                        <div key={tm.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                          <span className="font-medium">
                            {tm.users?.first_name} {tm.users?.last_name}
                          </span>
                          <div className="text-right text-muted-foreground text-xs">
                            <div>{tm.preferred_position ? POSITION_LABELS[tm.preferred_position] : '—'}</div>
                            <div>{tm.users?.skill_level ? SKILL_LEVEL_LABELS[tm.users.skill_level] : '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Register a Player Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Players</DialogTitle>
            <DialogDescription>
              {selectedSchedule ? `Adding players to: ${formatScheduleLabel(selectedSchedule)}` : 'Select a schedule first'}
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-6 py-4">
              {/* Registration Mode */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Registration Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['single', 'group', 'team'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRegistrationMode(mode)}
                      className={`p-3 rounded-md border-2 transition-all cursor-pointer text-sm font-medium ${
                        registrationMode === mode
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-card hover:border-primary/50 text-muted-foreground'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Players */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">Players</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {players.map((player, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-md bg-muted/30">
                      {player.type === 'empty' ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePlayerTypeChange(idx, 'existing')}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Existing Player
                          </Button>
                          <Button
                            onClick={() => handlePlayerTypeChange(idx, 'guest')}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Guest Player
                          </Button>
                        </div>
                      ) : player.type === 'existing' ? (
                        <>
                          <div className="relative">
                            <Label className="text-xs mb-1 block">Search Players</Label>
                            <Input
                              placeholder="Search by name or email..."
                              value={searchQuery}
                              onChange={(e) => handlePlayerSearch(e.target.value)}
                              className="h-8"
                            />
                            {searchResults.length > 0 && (
                              <div className="absolute bg-card border rounded-md mt-1 w-full max-h-32 overflow-y-auto z-10 top-full left-0">
                                {searchResults.map((user) => (
                                  <button
                                    key={user.id}
                                    onClick={() => handleSelectExistingPlayer(idx, user)}
                                    className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-0"
                                  >
                                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                                    <div className="text-xs text-muted-foreground">{user.email}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {player.user_id && (
                            <div className="text-sm text-foreground">
                              Selected: <span className="font-medium">{player.display_name}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs mb-1 block">First Name</Label>
                            <Input
                              value={player.first_name}
                              onChange={(e) => handlePlayerFieldChange(idx, 'first_name', e.target.value)}
                              placeholder="First"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Last Name</Label>
                            <Input
                              value={player.last_name}
                              onChange={(e) => handlePlayerFieldChange(idx, 'last_name', e.target.value)}
                              placeholder="Last"
                              className="h-8"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Email</Label>
                            <Input
                              type="email"
                              value={player.email}
                              onChange={(e) => handlePlayerFieldChange(idx, 'email', e.target.value)}
                              placeholder="email@example.com"
                              className="h-8"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs mb-1 block">Phone (optional)</Label>
                            <Input
                              value={player.phone}
                              onChange={(e) => handlePlayerFieldChange(idx, 'phone', e.target.value)}
                              placeholder="Phone"
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}

                      {/* Position */}
                      {player.type !== 'empty' && (
                        <div>
                          <Label className="text-xs mb-1 block">Position</Label>
                          <select
                            value={player.preferred_position}
                            onChange={(e) => handlePlayerFieldChange(idx, 'preferred_position', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-muted px-2 py-1 text-sm text-foreground"
                          >
                            <option value="">Select position...</option>
                            <option value="setter">Setter</option>
                            <option value="open_spiker">Open Spiker</option>
                            <option value="opposite_spiker">Opposite Spiker</option>
                            <option value="middle_blocker">Middle Blocker</option>
                            <option value="middle_setter">Middle Setter</option>
                          </select>
                        </div>
                      )}

                      {/* Remove button */}
                      {players.length > 1 && (
                        <Button
                          onClick={() => handleRemovePlayer(idx)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 w-full"
                        >
                          <Trash2 size={16} className="mr-1" />
                          Remove
                        </Button>
                      )}

                      {/* Add button (only on last player) */}
                      {idx === players.length - 1 && player.type !== 'empty' && (registrationMode === 'group' || registrationMode === 'team') && (
                        <Button
                          onClick={handleAddPlayer}
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                        >
                          <Plus size={16} />
                          Add Another Player
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <Label htmlFor="payment-status" className="text-sm font-semibold mb-2 block">
                  Payment Status
                </Label>
                <select
                  id="payment-status"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground"
                >
                  <option value="pending">Pending</option>
                  <option value="review">Under Review</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleRegisterDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRegistration} disabled={submitting || !selectedSchedule}>
              {submitting ? 'Registering...' : 'Register Players'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
