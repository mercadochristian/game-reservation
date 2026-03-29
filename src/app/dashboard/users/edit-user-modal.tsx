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
import { toast } from 'sonner'
import type { UserRole } from '@/types'
import { userEditSchema, type UserEditData } from '@/lib/validations/user-edit'

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
          <div className="space-y-4">{/* Form fields will be added in subsequent tasks */}</div>

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
