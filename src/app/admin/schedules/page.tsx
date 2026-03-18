'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, CalendarDays, Filter, ChevronDown, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { createClient } from '@/lib/supabase/client'
import { scheduleSchema, ScheduleFormData } from '@/lib/validations/schedule'
import type { ScheduleWithLocation, Location } from '@/types'
import { ScheduleInfo } from '@/components/schedule-info'
import { fadeUpVariants } from '@/lib/animations'
import { SKILL_LEVEL_LABELS, STATUS_LABELS } from '@/lib/constants/labels'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import {
  manilaInputToUTC,
  utcToManilaInput,
  toManilaDateKey,
} from '@/lib/utils/timezone'
import { formatScheduleLabel } from '@/lib/utils/schedule-label'

const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  full: 'secondary',
  cancelled: 'destructive',
  completed: 'outline',
}

const SKILL_LEVELS = [
  { value: 'developmental', label: 'Developmental' },
  { value: 'developmental_plus', label: 'Developmental+' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'intermediate_plus', label: 'Intermediate+' },
  { value: 'advanced', label: 'Advanced' },
] as const

const DEFAULT_PAGE_SIZE = 15

export default function SchedulesPage() {
  const supabase = createClient()
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterLocationId, setFilterLocationId] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      start_time: '',
      end_time: '',
      location_id: '',
      num_teams: 2,
      required_levels: [],
      status: 'open',
    },
  })

  const selectedLevels = watch('required_levels')

  // Load schedules and locations in parallel
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      const [schedulesRes, locationsRes] = await Promise.all([
        (supabase.from('schedules') as any)
          .select('*, locations(id, name)')
          .order('start_time', { ascending: false }),
        (supabase.from('locations') as any)
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
      ])

      if (schedulesRes.error) {
        console.error('[Schedules] Failed to load schedules:', schedulesRes.error)
        toast.error('Failed to load schedules', { description: getUserFriendlyMessage(schedulesRes.error) })
      } else {
        setSchedules(schedulesRes.data || [])
      }

      if (locationsRes.error) {
        console.error('[Schedules] Failed to load locations:', locationsRes.error)
        toast.error('Failed to load locations', { description: getUserFriendlyMessage(locationsRes.error) })
      } else {
        setLocations(locationsRes.data || [])
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  // Handle create/edit
  const onSubmit = async (formData: ScheduleFormData) => {
    try {
      if (editingId) {
        // Update
        const updateData = {
          title: formData.title,
          start_time: manilaInputToUTC(formData.start_time),
          end_time: manilaInputToUTC(formData.end_time),
          location_id: formData.location_id,
          num_teams: formData.num_teams,
          required_levels: formData.required_levels,
          status: formData.status,
        }
        const { error } = await (supabase.from('schedules') as any)
          .update(updateData)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Schedule updated')
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...updateData } : s))
        )
      } else {
        // Create
        const user = await supabase.auth.getUser()
        if (!user.data.user) {
          toast.error('Not authenticated')
          return
        }

        const insertData = {
          title: formData.title,
          start_time: manilaInputToUTC(formData.start_time),
          end_time: manilaInputToUTC(formData.end_time),
          location_id: formData.location_id,
          num_teams: formData.num_teams,
          required_levels: formData.required_levels,
          status: formData.status,
          created_by: user.data.user.id,
          max_players: formData.num_teams * 6,
        }
        const { data, error } = await (supabase.from('schedules') as any)
          .insert([insertData])
          .select('*, locations(id, name)')

        if (error) throw error
        if (data?.[0]) {
          setSchedules((prev) => [data[0], ...prev])
          setCurrentPage(1)
          toast.success('Schedule created')
        }
      }

      setDialogOpen(false)
      reset()
      setEditingId(null)
    } catch (error) {
      console.error('[Schedules] Failed to save schedule:', error)
      toast.error(editingId ? 'Failed to update schedule' : 'Failed to create schedule', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  // Handle edit
  const handleEdit = (schedule: ScheduleWithLocation) => {
    setEditingId(schedule.id)
    setValue('title', schedule.title)
    setValue('start_time', utcToManilaInput(schedule.start_time))
    setValue('end_time', utcToManilaInput(schedule.end_time))
    setValue('location_id', schedule.location_id)
    setValue('num_teams', schedule.num_teams)
    setValue('required_levels', schedule.required_levels || [])
    setValue('status', schedule.status)
    setDialogOpen(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error } = await (supabase.from('schedules') as any)
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error
      setSchedules((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setCurrentPage(1)
      setDeleteTarget(null)
      toast.success('Schedule deleted')
    } catch (error) {
      console.error('[Schedules] Failed to delete schedule:', error)
      toast.error('Failed to delete schedule', { description: getUserFriendlyMessage(error) })
    }
  }

  const handleOpenDialog = () => {
    reset()
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    reset()
    setEditingId(null)
  }

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (filterDate && toManilaDateKey(s.start_time) !== filterDate) return false
      if (filterLocationId && s.location_id !== filterLocationId) return false
      return true
    })
  }, [schedules, filterDate, filterLocationId])

  const activeFilterCount = (filterDate ? 1 : 0) + (filterLocationId ? 1 : 0)

  const paginatedSchedules = filteredSchedules.slice(
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
          <span className="text-foreground">Schedules</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Schedules</h1>
                <Badge variant="outline" className="text-xs">
                  {filteredSchedules.length}
                </Badge>
              </div>
              <p className="text-muted-foreground">Manage volleyball game schedules</p>
            </div>
            <Button onClick={handleOpenDialog} className="gap-2 w-full sm:w-auto">
              <Plus size={20} />
              New Schedule
            </Button>
          </div>
        </motion.div>

        {/* Filter Accordion */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants}
          className="bg-card border-border border rounded-lg mb-6 overflow-hidden">
          <button onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
            <span className="flex items-center gap-2">
              <Filter size={16} />
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </span>
            <ChevronDown size={16} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="px-4 pb-4 pt-2 flex flex-wrap items-end gap-3 border-t border-border">
                  <div className="flex-1 min-w-40">
                    <Label className="text-xs font-medium mb-1 block">Date</Label>
                    <Input type="date" value={filterDate}
                      onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1) }} className="h-9" />
                  </div>
                  <div className="flex-1 min-w-40">
                    <Label className="text-xs font-medium mb-1 block">Location</Label>
                    <select value={filterLocationId}
                      onChange={(e) => { setFilterLocationId(e.target.value); setCurrentPage(1) }}
                      className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">All locations</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterLocationId(''); setCurrentPage(1) }}
                      className="gap-1"><X size={14} />Clear</Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Table */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg overflow-hidden">
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Schedule</TableHead>
                  <TableHead className="hidden md:table-cell">Skill Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Teams</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                        <div className="h-3 bg-muted/50 rounded w-32 animate-pulse" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 bg-muted rounded w-28 animate-pulse" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 bg-muted rounded w-8 animate-pulse" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="h-8 bg-muted rounded w-20 ml-auto animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <CalendarDays size={48} className="text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground mb-4">{activeFilterCount > 0 ? 'No schedules match your filters.' : 'No schedules yet. Create one to get started.'}</p>
              <Button onClick={activeFilterCount > 0 ? () => { setFilterDate(''); setFilterLocationId('') } : handleOpenDialog} variant="outline" className="gap-2">
                <Plus size={18} />
                {activeFilterCount > 0 ? 'Clear Filters' : 'Add First Schedule'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Schedule</TableHead>
                  <TableHead className="hidden md:table-cell">Skill Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Teams</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSchedules.map((schedule) => (
                  <TableRow key={schedule.id} className="border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="py-4">
                      <ScheduleInfo schedule={schedule} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {schedule.required_levels && schedule.required_levels.length > 0
                        ? schedule.required_levels.map(level => SKILL_LEVEL_LABELS[level]).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANTS[schedule.status]} className="whitespace-nowrap">
                        {STATUS_LABELS[schedule.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {schedule.num_teams}
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(schedule)} title="Edit">
                          <Pencil size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget({ id: schedule.id, label: formatScheduleLabel(schedule) })}
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Pagination */}
        {filteredSchedules.length > 0 && !loading && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUpVariants} className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalCount={filteredSchedules.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Tuesday Night Volleyball"
                {...register('title')}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="start_time">Start Time (Manila Time) *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                {...register('start_time')}
                className={errors.start_time ? 'border-destructive' : ''}
              />
              {errors.start_time && <p className="text-xs text-destructive mt-1">{errors.start_time.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">All times in UTC+8</p>
            </div>

            <div>
              <Label htmlFor="end_time">End Time (Manila Time) *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                {...register('end_time')}
                className={errors.end_time ? 'border-destructive' : ''}
              />
              {errors.end_time && <p className="text-xs text-destructive mt-1">{errors.end_time.message}</p>}
            </div>

            <div>
              <Label htmlFor="location_id">Location *</Label>
              <select
                id="location_id"
                {...register('location_id')}
                className={`flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.location_id ? 'border-destructive' : ''
                }`}
              >
                <option value="">
                  {locations.length === 0 ? 'No active locations' : 'Select a location...'}
                </option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              {errors.location_id && <p className="text-xs text-destructive mt-1">{errors.location_id.message}</p>}
            </div>

            <div>
              <Label htmlFor="num_teams">Number of Teams *</Label>
              <Input
                id="num_teams"
                type="number"
                min={2}
                {...register('num_teams', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                className={errors.num_teams ? 'border-destructive' : ''}
              />
              {errors.num_teams && <p className="text-xs text-destructive mt-1">{errors.num_teams.message}</p>}
            </div>

            <div>
              <Label>Allowed Skill Levels</Label>
              <div className="space-y-2 mt-2">
                {SKILL_LEVELS.map((level) => (
                  <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={level.value}
                      checked={selectedLevels.includes(level.value as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue('required_levels', [...selectedLevels, level.value as any])
                        } else {
                          setValue('required_levels', selectedLevels.filter(l => l !== level.value))
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{level.label}</span>
                  </label>
                ))}
              </div>
              {errors.required_levels && <p className="text-xs text-destructive mt-2">{errors.required_levels.message}</p>}
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className={`flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.status ? 'border-destructive' : ''
                }`}
              >
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
              {errors.status && <p className="text-xs text-destructive mt-1">{errors.status.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Schedule?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.label}</span>? All associated teams and
              registrations will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
