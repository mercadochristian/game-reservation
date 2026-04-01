'use client'

import { useMemo, useState } from 'react'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, CalendarDays, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageHeader } from '@/components/ui/page-header'
import { FilterAccordion } from '@/components/filter-accordion'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { scheduleSchema, ScheduleFormData } from '@/lib/validations/schedule'
import type { ScheduleWithLocation, Location, SkillLevel } from '@/types'
import { ScheduleInfo } from '@/components/schedule-info'
import { fadeUpVariants } from '@/lib/animations'
import { SKILL_LEVEL_LABELS, STATUS_LABELS } from '@/lib/constants/labels'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { useCrudDialog } from '@/lib/hooks/useCrudDialog'
import { usePagination } from '@/lib/hooks/usePagination'
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

interface SchedulesClientProps {
  initialSchedules: ScheduleWithLocation[]
  initialLocations: Location[]
}

export function SchedulesClient({ initialSchedules, initialLocations }: SchedulesClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useUser()
  const hasAnimated = useHasAnimated()
  const [schedules, setSchedules] = useState<ScheduleWithLocation[]>(initialSchedules)
  const [locations] = useState<Location[]>(initialLocations)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterLocationId, setFilterLocationId] = useState('')

  const crudDialog = useCrudDialog()

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
      start_time: '',
      end_time: '',
      location_id: '',
      num_teams: 2,
      required_levels: [],
      status: 'open',
      position_prices: {
        open_spiker: 0,
        opposite_spiker: 0,
        middle_blocker: 0,
        setter: 0,
      },
      team_price: 0,
    },
  })

  const selectedLevels = watch('required_levels')

  const filteredSchedules = useMemo(() => {
    return (schedules ?? []).filter(s => {
      if (filterDate && toManilaDateKey(s.start_time) !== filterDate) return false
      if (filterLocationId && s.location_id !== filterLocationId) return false
      return true
    })
  }, [schedules, filterDate, filterLocationId])

  const pagination = usePagination<ScheduleWithLocation>(filteredSchedules, DEFAULT_PAGE_SIZE)

  const activeFilterCount = (filterDate ? 1 : 0) + (filterLocationId ? 1 : 0)

  // Handle create/edit
  const onSubmit = async (formData: ScheduleFormData) => {
    try {
      if (crudDialog.editingId) {
        // Update
        const updateData = {
          start_time: manilaInputToUTC(formData.start_time),
          end_time: manilaInputToUTC(formData.end_time),
          location_id: formData.location_id,
          num_teams: formData.num_teams,
          max_players: formData.num_teams * 6,
          required_levels: formData.required_levels,
          status: formData.status,
          position_prices: formData.position_prices,
          team_price: formData.team_price,
        }
        const { error } = await (supabase.from('schedules') as any)
          .update(updateData)
          .eq('id', crudDialog.editingId)

        if (error) throw error
        toast.success('Schedule updated')
        setSchedules((prev) =>
          prev.map((s) => (s.id === crudDialog.editingId ? { ...s, ...updateData } : s))
        )
        router.refresh()
      } else {
        // Create
        if (!currentUser) {
          toast.error('Not authenticated')
          return
        }

        const insertData = {
          start_time: manilaInputToUTC(formData.start_time),
          end_time: manilaInputToUTC(formData.end_time),
          location_id: formData.location_id,
          num_teams: formData.num_teams,
          required_levels: formData.required_levels,
          status: formData.status,
          created_by: currentUser.id,
          max_players: formData.num_teams * 6,
          position_prices: formData.position_prices,
          team_price: formData.team_price,
        }
        const { data, error } = await (supabase.from('schedules') as any)
          .insert([insertData])
          .select('*, locations(id, name, address, google_map_url)')

        if (error) throw error
        if (data?.[0]) {
          setSchedules((prev) => [data[0], ...prev])
          pagination.setCurrentPage(1)
          toast.success('Schedule created')
          router.refresh()
        }
      }

      crudDialog.onCloseDialog()
      reset()
    } catch (error) {
      console.error('[Schedules] Failed to save schedule:', error)
      toast.error(crudDialog.editingId ? 'Failed to update schedule' : 'Failed to create schedule', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  // Handle edit — populate form then open dialog
  const handleEdit = (schedule: ScheduleWithLocation) => {
    setValue('start_time', utcToManilaInput(schedule.start_time))
    setValue('end_time', utcToManilaInput(schedule.end_time))
    setValue('location_id', schedule.location_id)
    setValue('num_teams', schedule.num_teams)
    setValue('required_levels', (schedule.required_levels as unknown as SkillLevel[]) || [])
    setValue('status', schedule.status)
    setValue('position_prices', (schedule.position_prices as any) || {
      open_spiker: 0,
      opposite_spiker: 0,
      middle_blocker: 0,
      setter: 0,
    })
    setValue('team_price', schedule.team_price ?? 0)
    crudDialog.onOpenEdit(schedule.id)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!crudDialog.deleteTarget) return
    try {
      const { error } = await (supabase.from('schedules') as any)
        .delete()
        .eq('id', crudDialog.deleteTarget.id)

      if (error) throw error
      setSchedules((prev) => prev.filter((s) => s.id !== crudDialog.deleteTarget!.id))
      pagination.setCurrentPage(1)
      crudDialog.onCancelDelete()
      toast.success('Schedule deleted')
      router.refresh()
    } catch (error) {
      console.error('[Schedules] Failed to delete schedule:', error)
      toast.error('Failed to delete schedule', { description: getUserFriendlyMessage(error) })
    }
  }

  const handleOpenCreate = () => {
    reset()
    crudDialog.onOpenCreate()
  }

  const handleCloseDialog = () => {
    crudDialog.onCloseDialog()
    reset()
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        <PageHeader
          breadcrumb="Schedules"
          title="Schedules"
          count={filteredSchedules.length}
          description="Manage volleyball game schedules"
          action={{
            label: 'New Schedule',
            icon: Plus,
            onClick: handleOpenCreate,
          }}
        />

        {/* Filter Accordion */}
        <motion.div custom={0} initial={hasAnimated.current ? false : "hidden"} animate="visible" variants={fadeUpVariants}>
          <FilterAccordion
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            label="Filters"
            activeFilterCount={activeFilterCount}
          >
            <div className="pt-2 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-40">
                <Label className="text-xs font-medium mb-1 block">Date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value)
                    pagination.setCurrentPage(1)
                  }}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-40">
                <Label className="text-xs font-medium mb-1 block">Location</Label>
                <select
                  value={filterLocationId}
                  onChange={(e) => {
                    setFilterLocationId(e.target.value)
                    pagination.setCurrentPage(1)
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All locations</option>
                  {(locations ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterDate('')
                    setFilterLocationId('')
                    pagination.setCurrentPage(1)
                  }}
                  className="gap-1"
                >
                  <X size={14} />
                  Clear
                </Button>
              )}
            </div>
          </FilterAccordion>
        </motion.div>

        {/* Table */}
        <motion.div custom={1} initial={hasAnimated.current ? false : "hidden"} animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg overflow-hidden">
          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <CalendarDays size={48} className="text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground mb-4">{activeFilterCount > 0 ? 'No schedules match your filters.' : 'No schedules yet. Create one to get started.'}</p>
              <Button onClick={activeFilterCount > 0 ? () => { setFilterDate(''); setFilterLocationId('') } : handleOpenCreate} variant="outline" className="gap-2">
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
                {pagination.paginatedItems.map((schedule) => (
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
                          onClick={() => crudDialog.onOpenDeleteConfirm(schedule.id, formatScheduleLabel(schedule))}
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
        {filteredSchedules.length > 0 && (
          <motion.div custom={2} initial={hasAnimated.current ? false : "hidden"} animate="visible" variants={fadeUpVariants} className="mt-6">
            <Pagination
              currentPage={pagination.currentPage}
              totalCount={filteredSchedules.length}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </motion.div>
        )}
      </div>

      {/* Dialog for Create/Edit — conditionally mounted to avoid heavy DOM when closed */}
      {crudDialog.isOpen && (
        <Dialog open onOpenChange={(open) => { if (!open) handleCloseDialog() }}>
          <DialogContent className={"h-[95%]"}>
            <DialogHeader>
              <DialogTitle>{crudDialog.editingId ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    {(locations ?? []).length === 0 ? 'No active locations' : 'Select a location...'}
                  </option>
                  {(locations ?? []).map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {errors.location_id && <p className="text-xs text-destructive mt-1">{errors.location_id.message}</p>}
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

              <div className="border-t pt-4 mt-4">
                <Label className="text-sm font-semibold mb-3 block">Pricing *</Label>

                <div className="space-y-3 mb-4">
                  <div>
                    <Label htmlFor="position_open_spiker" className="text-xs">Open Spiker *</Label>
                    <Input
                      id="position_open_spiker"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="290"
                      {...register('position_prices.open_spiker', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                      className={`h-8 text-sm ${errors.position_prices?.open_spiker ? 'border-destructive' : ''}`}
                    />
                    {errors.position_prices?.open_spiker && <p className="text-xs text-destructive mt-1">{errors.position_prices.open_spiker.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="position_opposite_spiker" className="text-xs">Opposite Spiker *</Label>
                    <Input
                      id="position_opposite_spiker"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="290"
                      {...register('position_prices.opposite_spiker', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                      className={`h-8 text-sm ${errors.position_prices?.opposite_spiker ? 'border-destructive' : ''}`}
                    />
                    {errors.position_prices?.opposite_spiker && <p className="text-xs text-destructive mt-1">{errors.position_prices.opposite_spiker.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="position_middle_blocker" className="text-xs">Middle Blocker *</Label>
                    <Input
                      id="position_middle_blocker"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="260"
                      {...register('position_prices.middle_blocker', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                      className={`h-8 text-sm ${errors.position_prices?.middle_blocker ? 'border-destructive' : ''}`}
                    />
                    {errors.position_prices?.middle_blocker && <p className="text-xs text-destructive mt-1">{errors.position_prices.middle_blocker.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="position_setter" className="text-xs">Setter *</Label>
                    <Input
                      id="position_setter"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="260"
                      {...register('position_prices.setter', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                      className={`h-8 text-sm ${errors.position_prices?.setter ? 'border-destructive' : ''}`}
                    />
                    {errors.position_prices?.setter && <p className="text-xs text-destructive mt-1">{errors.position_prices.setter.message}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="team_price" className="text-xs">Team Price (Total) *</Label>
                  <Input
                    id="team_price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="1600"
                    {...register('team_price', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                    className={`h-8 text-sm ${errors.team_price ? 'border-destructive' : ''}`}
                  />
                  {errors.team_price && <p className="text-xs text-destructive mt-1">{errors.team_price.message}</p>}
                </div>
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
                <Button type="submit">{crudDialog.editingId ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog for Delete Confirmation */}
      <ConfirmDeleteDialog
        open={crudDialog.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crudDialog.onCancelDelete()
        }}
        title="Delete Schedule?"
        targetName={crudDialog.deleteTarget?.label}
        warningText="All associated teams and registrations will also be deleted."
        onConfirm={handleDelete}
        onCancel={crudDialog.onCancelDelete}
      />
    </>
  )
}
