'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { locationSchema, LocationFormData } from '@/lib/validations/location'
import { Location } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'

export default function LocationsPage() {
  const supabase = createClient()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
      google_map_url: '',
      notes: '',
      is_active: true,
    },
  })

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true)
      const { data, error } = await (supabase.from('locations') as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Locations] Failed to load locations:', error)
        toast.error('Failed to load locations', { description: getUserFriendlyMessage(error) })
      } else {
        setLocations(data || [])
      }
      setLoading(false)
    }

    loadLocations()
  }, [supabase])

  // Handle create/edit
  const onSubmit = async (formData: LocationFormData) => {
    try {
      if (editingId) {
        // Update - only include updatable fields
        const updateData = {
          name: formData.name,
          address: formData.address || null,
          google_map_url: formData.google_map_url || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
        }
        const { error } = await (supabase.from('locations') as any).update(updateData).eq('id', editingId)

        if (error) throw error
        toast.success('Location updated')
        setLocations((prev) =>
          prev.map((loc) => (loc.id === editingId ? { ...loc, ...updateData } : loc))
        )
      } else {
        // Create
        const user = await supabase.auth.getUser()
        if (!user.data.user) {
          toast.error('Not authenticated')
          return
        }

        const insertData = {
          name: formData.name,
          address: formData.address || null,
          google_map_url: formData.google_map_url || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
          created_by: user.data.user.id,
        }

        const { data, error } = await (supabase.from('locations') as any).insert([insertData]).select()

        if (error) throw error
        if (data?.[0]) {
          setLocations((prev) => [data[0], ...prev])
          toast.success('Location created')
        }
      }

      setDialogOpen(false)
      reset()
      setEditingId(null)
    } catch (error) {
      console.error('[Locations] Failed to save location:', error)
      toast.error(editingId ? 'Failed to update location' : 'Failed to create location', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  // Handle edit
  const handleEdit = (location: Location) => {
    setEditingId(location.id)
    setValue('name', location.name)
    setValue('address', location.address || '')
    setValue('google_map_url', location.google_map_url || '')
    setValue('notes', location.notes || '')
    setValue('is_active', location.is_active)
    setDialogOpen(true)
  }

  // Handle toggle active
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase.from('locations') as any).update({ is_active: !currentStatus }).eq('id', id)

      if (error) throw error
      setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, is_active: !currentStatus } : loc)))
      toast.success(currentStatus ? 'Location deactivated' : 'Location activated')
    } catch (error) {
      console.error('[Locations] Failed to toggle location status:', error)
      toast.error('Failed to update location status', { description: getUserFriendlyMessage(error) })
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error } = await (supabase.from('locations') as any).delete().eq('id', deleteTarget.id)

      if (error) throw error
      setLocations((prev) => prev.filter((loc) => loc.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Location deleted')
    } catch (error) {
      console.error('[Locations] Failed to delete location:', error)
      toast.error('Failed to delete location', { description: getUserFriendlyMessage(error) })
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

  const tableContent = loading ? (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {['skeleton-0', 'skeleton-1', 'skeleton-2'].map((key) => (
          <TableRow key={key} className="border-border">
            <TableCell className="py-4">
              <div className="space-y-1">
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-3 bg-muted/50 rounded w-24 animate-pulse" />
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="h-4 bg-muted rounded w-40 animate-pulse" />
            </TableCell>
            <TableCell>
              <div className="h-4 bg-muted rounded w-16 animate-pulse" />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
            </TableCell>
            <TableCell className="text-right">
              <div className="h-8 bg-muted rounded w-24 ml-auto animate-pulse" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : locations.length === 0 ? (
    <div className="p-12 text-center">
      <div className="flex justify-center mb-4">
        <MapPin size={48} className="text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground mb-4">No locations yet. Create one to get started.</p>
      <Button onClick={handleOpenDialog} variant="outline" className="gap-2">
        <Plus size={18} />
        Add First Location
      </Button>
    </div>
  ) : (
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((location) => (
          <TableRow key={location.id} className="border-border hover:bg-muted/50 transition-colors">
            <TableCell className="py-4">
              <div>
                <div className="font-medium text-foreground">{location.name}</div>
                {location.notes && (
                  <div className="text-sm text-muted-foreground truncate mt-1">{location.notes}</div>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{location.address || '—'}</span>
                {location.google_map_url && (
                  <a
                    href={location.google_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/80 transition-colors"
                    title="Open in Google Maps"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={location.is_active ? 'default' : 'secondary'} className="whitespace-nowrap">
                {location.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
              {new Date(location.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right py-4">
              <div className="flex justify-end gap-1 flex-wrap">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleToggleActive(location.id, location.is_active)}
                  title={location.is_active ? 'Deactivate' : 'Activate'}
                >
                  {location.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(location)} title="Edit">
                  <Pencil size={18} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget({ id: location.id, name: location.name })}
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
  )

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Locations</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Locations</h1>
                <Badge variant="outline" className="text-xs">
                  {locations.length}
                </Badge>
              </div>
              <p className="text-muted-foreground">Manage gym and court locations</p>
            </div>
            <Button onClick={handleOpenDialog} className="gap-2 w-full sm:w-auto">
              <Plus size={20} />
              New Location
            </Button>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg overflow-hidden">
          {tableContent}
        </motion.div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Location' : 'Create Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Downtown Court"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                {...register('address')}
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
            </div>

            <div>
              <Label htmlFor="google_map_url">Google Maps URL</Label>
              <Input
                id="google_map_url"
                placeholder="https://maps.google.com/..."
                {...register('google_map_url')}
                className={errors.google_map_url ? 'border-destructive' : ''}
              />
              {errors.google_map_url && <p className="text-xs text-destructive mt-1">{errors.google_map_url.message}</p>}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="e.g., Only available on weekends"
                {...register('notes')}
                className={errors.notes ? 'border-destructive' : ''}
              />
              {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
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
            <DialogTitle>Delete Location?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
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
