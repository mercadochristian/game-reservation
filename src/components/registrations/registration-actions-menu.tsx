'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, CheckCircle, Zap, Trash2 } from 'lucide-react'
import type { RegistrationWithDetails } from '@/types'

interface RegistrationActionsMenuProps {
  registration: RegistrationWithDetails
  isPastGame: boolean
  isAdmin: boolean
  onViewDetails?: () => void
  onMarkAttendance?: () => void
  onReassignTeam?: () => void
  onVerifyPayment?: () => void
  onDelete?: () => void
  onEdit?: () => void
}

export function RegistrationActionsMenu({
  registration,
  isPastGame,
  isAdmin,
  onViewDetails,
  onMarkAttendance,
  onReassignTeam,
  onVerifyPayment,
  onDelete,
  onEdit,
}: RegistrationActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-1.5 hover:bg-muted rounded-md transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <MoreHorizontal size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye size={16} className="mr-2" />
            View Details
          </DropdownMenuItem>
        )}

        {!isPastGame && onMarkAttendance && (
          <DropdownMenuItem onClick={onMarkAttendance}>
            <CheckCircle size={16} className="mr-2" />
            Mark Attendance
          </DropdownMenuItem>
        )}

        {onReassignTeam && (
          <DropdownMenuItem onClick={onReassignTeam}>
            <Zap size={16} className="mr-2" />
            Reassign Team
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            {onVerifyPayment && (
              <DropdownMenuItem onClick={onVerifyPayment}>
                <CheckCircle size={16} className="mr-2" />
                Verify Payment
              </DropdownMenuItem>
            )}

            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Eye size={16} className="mr-2" />
                Edit
              </DropdownMenuItem>
            )}

            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
