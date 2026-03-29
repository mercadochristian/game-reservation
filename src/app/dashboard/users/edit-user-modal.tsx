'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { UserRole } from '@/types'
import { userEditSchema, type UserEditData } from '@/lib/validations/user-edit'
import { canEditField } from '@/lib/permissions/user-editing'

interface UserRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
  skill_level: string | null
  player_contact_number: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_number: string | null
  is_guest: boolean
  created_at: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user: UserRow
  currentUserRole: UserRole
}

export function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  currentUserRole,
}: EditUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    getValues,
  } = useForm<UserEditData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      player_contact_number: user.player_contact_number || '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_relationship: user.emergency_contact_relationship || '',
      emergency_contact_number: user.emergency_contact_number || '',
      skill_level: (user.skill_level || '') as any,
      role: user.role as UserRole,
    },
  })

  const currentRole = watch('role')

  const submitForm = async (data: UserEditData) => {
    setIsSubmitting(true)
    try {
      const payload: Partial<UserEditData> = {}

      // Build payload with only editable fields
      const editableFields: Array<keyof UserEditData> = [
        'first_name',
        'last_name',
        'email',
        'player_contact_number',
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_number',
        'skill_level',
        'role',
      ]

      for (const field of editableFields) {
        if (canEditField(currentUserRole, field)) {
          payload[field] = data[field]
        }
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || 'Failed to update user')
        return
      }

      toast.success('User updated successfully')
      onSuccess?.()
      onClose()
      reset()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onFormSubmit = async (data: UserEditData) => {
    // If role is changing, show confirmation first
    if (data.role && data.role !== user.role) {
      setPendingRole(data.role)
      setShowRoleConfirm(true)
      return
    }

    // Otherwise submit immediately
    await submitForm(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                disabled={!canEditField(currentUserRole, 'first_name')}
              />
              {errors.first_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.first_name.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                disabled={!canEditField(currentUserRole, 'last_name')}
              />
              {errors.last_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.last_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={!canEditField(currentUserRole, 'email')}
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Player Contact Number */}
            <div>
              <Label htmlFor="player_contact_number">Phone Number</Label>
              <Input
                id="player_contact_number"
                type="tel"
                {...register('player_contact_number')}
                disabled={!canEditField(currentUserRole, 'player_contact_number')}
              />
              {errors.player_contact_number && (
                <p className="text-destructive text-sm mt-1">
                  {errors.player_contact_number.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Name */}
            <div>
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                {...register('emergency_contact_name')}
                disabled={!canEditField(currentUserRole, 'emergency_contact_name')}
              />
              {errors.emergency_contact_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_name.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Relationship */}
            <div>
              <Label htmlFor="emergency_contact_relationship">Relationship</Label>
              <Input
                id="emergency_contact_relationship"
                {...register('emergency_contact_relationship')}
                disabled={!canEditField(currentUserRole, 'emergency_contact_relationship')}
              />
              {errors.emergency_contact_relationship && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_relationship.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Number */}
            <div>
              <Label htmlFor="emergency_contact_number">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_number"
                type="tel"
                {...register('emergency_contact_number')}
                disabled={!canEditField(currentUserRole, 'emergency_contact_number')}
              />
              {errors.emergency_contact_number && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_number.message}
                </p>
              )}
            </div>

            {/* Skill Level */}
            <div>
              <Label htmlFor="skill_level">Skill Level</Label>
              <select
                id="skill_level"
                {...register('skill_level')}
                disabled={!canEditField(currentUserRole, 'skill_level')}
                className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">None</option>
                <option value="developmental">Developmental</option>
                <option value="developmental_plus">Developmental+</option>
                <option value="intermediate">Intermediate</option>
                <option value="intermediate_plus">Intermediate+</option>
                <option value="advanced">Advanced</option>
              </select>
              {errors.skill_level && (
                <p className="text-destructive text-sm mt-1">
                  {errors.skill_level.message}
                </p>
              )}
            </div>

            {/* Role - only show for super_admin and admin */}
            {canEditField(currentUserRole, 'role') && (
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-background"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="facilitator">Facilitator</option>
                  <option value="player">Player</option>
                </select>
                {errors.role && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>

        {/* Role Change Confirmation Dialog */}
        {showRoleConfirm && (
          <Dialog
            open={showRoleConfirm}
            onOpenChange={(open) => {
              if (!open) {
                setShowRoleConfirm(false)
                setPendingRole(null)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Role?</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">
                Change {user.first_name} {user.last_name}'s role from{' '}
                <span className="font-medium text-foreground">{user.role}</span> to{' '}
                <span className="font-medium text-foreground">{pendingRole}</span>?
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRoleConfirm(false)
                    setPendingRole(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    const data = getValues()
                    setShowRoleConfirm(false)
                    setPendingRole(null)
                    await submitForm(data)
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
