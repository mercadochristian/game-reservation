'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink, MapPin } from 'lucide-react'
import { useHasAnimated } from '@/lib/hooks/useHasAnimated'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/user-context'
import { locationSchema, LocationFormData } from '@/lib/validations/location'
import { Location } from '@/types'
import { fadeUpVariants } from '@/lib/animations'
import { getUserFriendlyMessage } from '@/lib/errors/messages'
import { useCrudDialog } from '@/lib/hooks/useCrudDialog'

interface LocationsClientProps {
  initialLocations: Location[]
}

export function LocationsClient({ initialLocations }: LocationsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useUser()
  const hasAnimated = useHasAnimated()
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const crudDialog = useCrudDialog()

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

  // Handle create/edit
  const onSubmit = async (formData: LocationFormData) => {
    try {
      if (crudDialog.editingId) {
        // Update - only include updatable fields
        const updateData = {
          name: formData.name,
          address: formData.address || null,
          google_map_url: formData.google_map_url || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
        }
        const { error } = await supabase.from('locations').update(updateData).eq('id', crudDialog.editingId)

        if (error) throw error
        toast.success('Location updated')
        setLocations((prev) =>
          prev.map((loc) => (loc.id === crudDialog.editingId ? { ...loc, ...updateData } : loc))
        )
        router.refresh()
      } else {
        // Create
        if (!currentUser) {
          toast.error('Not authenticated')
          return
        }

        const insertData = {
          name: formData.name,
          address: formData.address || null,
          google_map_url: formData.google_map_url || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
          created_by: currentUser.id,
        }

        const { data, error } = await supabase.from('locations').insert([insertData]).select()

        if (error) throw error
        if (data?.[0]) {
          setLocations((prev) => [data[0], ...prev])
          toast.success('Location created')
          router.refresh()
        }
      }

      reset()
      crudDialog.onCloseDialog()
    } catch (error) {
      console.error('[Locations] Failed to save location:', error)
      toast.error(crudDialog.editingId ? 'Failed to update location' : 'Failed to create location', {
        description: getUserFriendlyMessage(error),
      })
    }
  }

  // Handle edit
  const handleEdit = (location: Location) => {
    reset()
    setValue('name', location.name)
    setValue('address', location.address || '')
    setValue('google_map_url', location.google_map_url || '')
    setValue('notes', location.notes || '')
    setValue('is_active', location.is_active)
    crudDialog.onOpenEdit(location.id)
  }

  // Handle toggle active
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('locations').update({ is_active: !currentStatus }).eq('id', id)

      if (error) throw error
      setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, is_active: !currentStatus } : loc)))
      toast.success(currentStatus ? 'Location deactivated' : 'Location activated')
      router.refresh()
    } catch (error) {
      console.error('[Locations] Failed to toggle location status:', error)
      toast.error('Failed to update location status', { description: getUserFriendlyMessage(error) })
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!crudDialog.deleteTarget) return
    try {
      const { error } = await supabase.from('locations').delete().eq('id', crudDialog.deleteTarget.id)

      if (error) throw error
      setLocations((prev) => prev.filter((loc) => loc.id !== crudDialog.deleteTarget?.id))
      crudDialog.onCancelDelete()
      toast.success('Location deleted')
      router.refresh()
    } catch (error) {
      console.error('[Locations] Failed to delete location:', error)
      toast.error('Failed to delete location', { description: getUserFriendlyMessage(error) })
    }
  }

  const handleOpenDialog = () => {
    reset()
    crudDialog.onOpenCreate()
  }

  const handleCloseDialog = () => {
    reset()
    crudDialog.onCloseDialog()
  }

  const tableContent = (locations ?? []).length === 0 ? (
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
        {(locations ?? []).map((location) => (
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
                  onClick={() => crudDialog.onOpenDeleteConfirm(location.id, location.name)}
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
        <PageHeader
          breadcrumb="Locations"
          title="Locations"
          count={(locations ?? []).length}
          description="Manage gym and court locations"
          action={{
            label: 'New Location',
            icon: Plus,
            onClick: handleOpenDialog,
          }}
        />

        {/* Table */}
        <motion.div custom={0} initial={hasAnimated.current ? false : "hidden"} animate="visible" variants={fadeUpVariants} className="bg-card border-border border rounded-lg overflow-hidden">
          {tableContent}
        </motion.div>
      </div>

      {/* Dialog for Create/Edit */}
      <Dialog open={crudDialog.isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{crudDialog.editingId ? 'Edit Location' : 'Create Location'}</DialogTitle>
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
              <Button type="submit">{crudDialog.editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Delete Confirmation */}
      <ConfirmDeleteDialog
        open={crudDialog.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) crudDialog.onCancelDelete()
        }}
        title="Delete Location?"
        targetName={crudDialog.deleteTarget?.label}
        warningText="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => crudDialog.onCancelDelete()}
      />
    </>
  )
}
