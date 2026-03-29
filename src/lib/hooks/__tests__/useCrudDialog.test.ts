// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCrudDialog } from '../useCrudDialog'

describe('useCrudDialog', () => {
  describe('Initial State', () => {
    it('should have isOpen = false', () => {
      const { result } = renderHook(() => useCrudDialog())
      expect(result.current.isOpen).toBe(false)
    })

    it('should have editingId = null', () => {
      const { result } = renderHook(() => useCrudDialog())
      expect(result.current.editingId).toBeNull()
    })

    it('should have deleteTarget = null', () => {
      const { result } = renderHook(() => useCrudDialog())
      expect(result.current.deleteTarget).toBeNull()
    })
  })

  describe('onOpenCreate()', () => {
    it('should set isOpen = true', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.isOpen).toBe(true)
    })

    it('should set editingId = null', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.editingId).toBeNull()
    })

    it('should clear editingId if previously editing', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.editingId).toBeNull()
    })
  })

  describe('onOpenEdit(id)', () => {
    it('should set isOpen = true', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.isOpen).toBe(true)
    })

    it('should set editingId to provided id', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
    })

    it('should update editingId when called with different id', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.onOpenEdit('item-2')
      })
      expect(result.current.editingId).toBe('item-2')
    })
  })

  describe('onOpenDeleteConfirm(id, label)', () => {
    it('should set deleteTarget with id and label', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Test Item')
      })
      expect(result.current.deleteTarget).toEqual({ id: 'item-1', label: 'Test Item' })
    })

    it('should keep isOpen unchanged', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      const openBefore = result.current.isOpen
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Test Item')
      })
      expect(result.current.isOpen).toBe(openBefore)
    })

    it('should overwrite previous deleteTarget', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item 1')
      })
      expect(result.current.deleteTarget?.id).toBe('item-1')
      act(() => {
        result.current.onOpenDeleteConfirm('item-2', 'Item 2')
      })
      expect(result.current.deleteTarget).toEqual({ id: 'item-2', label: 'Item 2' })
    })
  })

  describe('onCloseDialog()', () => {
    it('should set isOpen = false', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.isOpen).toBe(true)
      act(() => {
        result.current.onCloseDialog()
      })
      expect(result.current.isOpen).toBe(false)
    })

    it('should clear editingId', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.onCloseDialog()
      })
      expect(result.current.editingId).toBeNull()
    })

    it('should not clear deleteTarget', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item 1')
      })
      act(() => {
        result.current.onCloseDialog()
      })
      // deleteTarget should remain for independent delete flow
      expect(result.current.deleteTarget).toEqual({ id: 'item-1', label: 'Item 1' })
    })
  })

  describe('onCancelDelete()', () => {
    it('should clear deleteTarget', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item 1')
      })
      expect(result.current.deleteTarget).not.toBeNull()
      act(() => {
        result.current.onCancelDelete()
      })
      expect(result.current.deleteTarget).toBeNull()
    })

    it('should not affect isOpen', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      const openBefore = result.current.isOpen
      act(() => {
        result.current.onCancelDelete()
      })
      expect(result.current.isOpen).toBe(openBefore)
    })
  })

  describe('reset()', () => {
    it('should reset isOpen to false', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.isOpen).toBe(true)
      act(() => {
        result.current.reset()
      })
      expect(result.current.isOpen).toBe(false)
    })

    it('should reset editingId to null', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.reset()
      })
      expect(result.current.editingId).toBeNull()
    })

    it('should reset deleteTarget to null', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item 1')
      })
      expect(result.current.deleteTarget).not.toBeNull()
      act(() => {
        result.current.reset()
      })
      expect(result.current.deleteTarget).toBeNull()
    })

    it('should reset all state together', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
        result.current.onOpenDeleteConfirm('item-2', 'Item 2')
      })
      expect(result.current.isOpen).toBe(true)
      expect(result.current.editingId).toBe('item-1')
      expect(result.current.deleteTarget).not.toBeNull()
      act(() => {
        result.current.reset()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editingId).toBeNull()
      expect(result.current.deleteTarget).toBeNull()
    })
  })

  describe('State Transitions — Create Flow', () => {
    it('should handle create → close sequence', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.isOpen).toBe(true)
      expect(result.current.editingId).toBeNull()
      act(() => {
        result.current.onCloseDialog()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editingId).toBeNull()
    })
  })

  describe('State Transitions — Edit Flow', () => {
    it('should handle edit → close sequence', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.isOpen).toBe(true)
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.onCloseDialog()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editingId).toBeNull()
    })
  })

  describe('State Transitions — Delete Flow', () => {
    it('should handle delete confirm → cancel sequence', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item Name')
      })
      expect(result.current.deleteTarget).toEqual({ id: 'item-1', label: 'Item Name' })
      act(() => {
        result.current.onCancelDelete()
      })
      expect(result.current.deleteTarget).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should allow delete and edit independently', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
      })
      act(() => {
        result.current.onOpenDeleteConfirm('item-1', 'Item 1')
      })
      // Dialog is open and delete target is set, can cancel delete and continue editing
      expect(result.current.isOpen).toBe(true)
      expect(result.current.deleteTarget).not.toBeNull()
      act(() => {
        result.current.onCancelDelete()
      })
      // Dialog stays open, can continue editing
      expect(result.current.isOpen).toBe(true)
      expect(result.current.deleteTarget).toBeNull()
    })

    it('should switch from edit to create mode', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenEdit('item-1')
      })
      expect(result.current.editingId).toBe('item-1')
      act(() => {
        result.current.onOpenCreate()
      })
      expect(result.current.editingId).toBeNull()
      expect(result.current.isOpen).toBe(true)
    })

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useCrudDialog())
      act(() => {
        result.current.onOpenCreate()
        result.current.onOpenEdit('item-1')
        result.current.onOpenCreate()
        result.current.onCloseDialog()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.editingId).toBeNull()
    })
  })
})
