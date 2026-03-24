'use client'

import { useState, useCallback } from 'react'

/**
 * Dialog state for CRUD operations
 */
export interface CrudDialogState {
  /** True if dialog is open */
  isOpen: boolean
  /** ID of item being edited, null if creating new */
  editingId: string | null
  /** Holds the ID and label of item marked for deletion */
  deleteTarget: { id: string; label: string } | null
}

/**
 * Handler functions for CRUD dialog state transitions
 */
export interface CrudDialogHandlers {
  /** Opens dialog for creating a new item. */
  onOpenCreate: () => void
  /** Opens dialog for editing an item. */
  onOpenEdit: (id: string) => void
  /** Marks an item for deletion. Opens confirm dialog. */
  onOpenDeleteConfirm: (id: string, label: string) => void
  /** Closes dialog and resets edit state. */
  onCloseDialog: () => void
  /** Closes delete confirmation. */
  onCancelDelete: () => void
  /** Resets all state. */
  reset: () => void
}

/**
 * Combined return type from useCrudDialog hook
 */
export type UseCrudDialogReturn = CrudDialogState & CrudDialogHandlers

/**
 * Hook for managing CRUD dialog state and handlers.
 *
 * Encapsulates the state machine for create/edit/delete dialog flows.
 * Does not handle API calls—those remain in the page component.
 *
 * @returns Dialog state and handler functions
 *
 * @example
 * const { isOpen, editingId, deleteTarget, onOpenCreate, onCloseDialog, ... } = useCrudDialog()
 *
 * // In page:
 * <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseDialog()}>
 *   <DialogTitle>{editingId ? 'Edit Item' : 'Create Item'}</DialogTitle>
 * </Dialog>
 *
 * <ConfirmDeleteDialog
 *   open={deleteTarget !== null}
 *   targetName={deleteTarget?.label}
 *   onConfirm={() => handleDelete()}
 *   onCancel={() => onCancelDelete()}
 * />
 */
export function useCrudDialog(): UseCrudDialogReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  const onOpenCreate = useCallback(() => {
    setIsOpen(true)
    setEditingId(null)
  }, [])

  const onOpenEdit = useCallback((id: string) => {
    setIsOpen(true)
    setEditingId(id)
  }, [])

  const onOpenDeleteConfirm = useCallback((id: string, label: string) => {
    setDeleteTarget({ id, label })
  }, [])

  const onCloseDialog = useCallback(() => {
    setIsOpen(false)
    setEditingId(null)
  }, [])

  const onCancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  const reset = useCallback(() => {
    setIsOpen(false)
    setEditingId(null)
    setDeleteTarget(null)
  }, [])

  return {
    isOpen,
    editingId,
    deleteTarget,
    onOpenCreate,
    onOpenEdit,
    onOpenDeleteConfirm,
    onCloseDialog,
    onCancelDelete,
    reset,
  }
}
