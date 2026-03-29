'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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

function getEditableFields(userRole: UserRole): string[] {
  const baseFields = ['skill_level']

  if (userRole === 'super_admin' || userRole === 'admin') {
    return [
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
  }

  return baseFields
}

function isFieldEditable(fieldName: string, userRole: UserRole): boolean {
  return getEditableFields(userRole).includes(fieldName)
}

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
      skill_level: user.skill_level as any,
      role: user.role as UserRole,
    },
  })

  const currentRole = watch('role')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (data) => {
            // Placeholder for submission logic
            console.log('Form submitted:', data)
          })}
        >
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                disabled={!isFieldEditable('first_name', currentUserRole)}
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
                disabled={!isFieldEditable('last_name', currentUserRole)}
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
                disabled={!isFieldEditable('email', currentUserRole)}
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
                {...register('player_contact_number')}
                disabled={!isFieldEditable('player_contact_number', currentUserRole)}
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
                disabled={!isFieldEditable('emergency_contact_name', currentUserRole)}
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
                disabled={!isFieldEditable('emergency_contact_relationship', currentUserRole)}
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
                {...register('emergency_contact_number')}
                disabled={!isFieldEditable('emergency_contact_number', currentUserRole)}
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
                disabled={!isFieldEditable('skill_level', currentUserRole)}
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
            {isFieldEditable('role', currentUserRole) && (
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
      </DialogContent>
    </Dialog>
  )
}
