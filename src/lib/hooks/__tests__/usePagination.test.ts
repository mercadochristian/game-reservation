// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../usePagination'

describe('usePagination', () => {
  describe('Initial State', () => {
    it('should start at page 1', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.currentPage).toBe(1)
    })

    it('should use provided pageSize', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 10))
      expect(result.current.pageSize).toBe(10)
    })

    it('should default to pageSize 10', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items))
      expect(result.current.pageSize).toBe(10)
    })
  })

  describe('Computed Values — First Page', () => {
    it('should return first 15 items on page 1', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.paginatedItems[0].id).toBe('item-0')
      expect(result.current.paginatedItems[14].id).toBe('item-14')
    })

    it('should have totalPages = 2 for 30 items with pageSize 15', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(2)
    })

    it('should have hasPreviousPage = false on first page', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.hasPreviousPage).toBe(false)
    })

    it('should have hasNextPage = true when more pages exist', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.hasNextPage).toBe(true)
    })
  })

  describe('Page Navigation', () => {
    it('should navigate to page 2', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(2)
      })
      expect(result.current.currentPage).toBe(2)
      expect(result.current.paginatedItems[0].id).toBe('item-15')
      expect(result.current.paginatedItems[14].id).toBe('item-29')
    })

    it('should have hasPreviousPage = true on page 2', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(2)
      })
      expect(result.current.hasPreviousPage).toBe(true)
    })

    it('should have hasNextPage = false on last page', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(2)
      })
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should clamp page to minimum 1', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(0)
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('should clamp page to maximum totalPages', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(999)
      })
      expect(result.current.currentPage).toBe(2)
    })

    it('should clamp negative page to 1', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(-5)
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('should handle float page numbers by flooring', () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(1.7)
      })
      expect(result.current.currentPage).toBe(1)
      act(() => {
        result.current.setCurrentPage(2.1)
      })
      expect(result.current.currentPage).toBe(2)
    })
  })

  describe('Slicing Correctness', () => {
    it('should slice correctly for 50 items with pageSize 15', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))

      // Page 1: items 0-14
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.paginatedItems[0].id).toBe('item-0')
      expect(result.current.paginatedItems[14].id).toBe('item-14')

      act(() => {
        result.current.setCurrentPage(2)
      })
      // Page 2: items 15-29
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.paginatedItems[0].id).toBe('item-15')
      expect(result.current.paginatedItems[14].id).toBe('item-29')

      act(() => {
        result.current.setCurrentPage(3)
      })
      // Page 3: items 30-44
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.paginatedItems[0].id).toBe('item-30')
      expect(result.current.paginatedItems[14].id).toBe('item-44')

      act(() => {
        result.current.setCurrentPage(4)
      })
      // Page 4: items 45-49 (only 5 items)
      expect(result.current.paginatedItems).toHaveLength(5)
      expect(result.current.paginatedItems[0].id).toBe('item-45')
      expect(result.current.paginatedItems[4].id).toBe('item-49')
    })

    it('should handle last page with fewer items', () => {
      const items = Array.from({ length: 47 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      // 47 items with pageSize 15 = 4 pages
      // Page 4 has items 45-46 (2 items)
      act(() => {
        result.current.setCurrentPage(4)
      })
      expect(result.current.paginatedItems).toHaveLength(2)
      expect(result.current.paginatedItems[0].id).toBe('item-45')
      expect(result.current.paginatedItems[1].id).toBe('item-46')
    })
  })

  describe('Page Size Changes', () => {
    it('should update paginatedItems when pageSize changes', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.paginatedItems).toHaveLength(15)

      act(() => {
        result.current.setPageSize(25)
      })
      expect(result.current.pageSize).toBe(25)
      expect(result.current.paginatedItems).toHaveLength(25)
      expect(result.current.paginatedItems[0].id).toBe('item-0')
      expect(result.current.paginatedItems[24].id).toBe('item-24')
    })

    it('should reset to page 1 when pageSize changes', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(2)
      })
      expect(result.current.currentPage).toBe(2)
      act(() => {
        result.current.setPageSize(25)
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('should recalculate totalPages on pageSize change', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(4)

      act(() => {
        result.current.setPageSize(25)
      })
      expect(result.current.totalPages).toBe(2)

      act(() => {
        result.current.setPageSize(10)
      })
      expect(result.current.totalPages).toBe(5)
    })

    it('should clamp pageSize to minimum 1', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setPageSize(0)
      })
      expect(result.current.pageSize).toBe(1)
    })

    it('should clamp negative pageSize to 1', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setPageSize(-5)
      })
      expect(result.current.pageSize).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const items: { id: string }[] = []
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
      expect(result.current.paginatedItems).toHaveLength(0)
      expect(result.current.hasPreviousPage).toBe(false)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should handle single item', () => {
      const items = [{ id: 'item-0' }]
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
      expect(result.current.paginatedItems).toHaveLength(1)
      expect(result.current.hasPreviousPage).toBe(false)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should handle items exactly equal to pageSize', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should handle items one more than pageSize', () => {
      const items = Array.from({ length: 16 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(2)
      expect(result.current.paginatedItems).toHaveLength(15)
      expect(result.current.hasNextPage).toBe(true)
    })
  })

  describe('Dynamic Items Updates', () => {
    it('should update paginatedItems when items array changes', () => {
      const items1 = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, 15),
        { initialProps: { items: items1 } }
      )
      expect(result.current.paginatedItems[0].id).toBe('item-0')

      const items2 = Array.from({ length: 30 }, (_, i) => ({ id: `new-item-${i}` }))
      rerender({ items: items2 })
      expect(result.current.paginatedItems[0].id).toBe('new-item-0')
    })

    it('should clamp page when items are filtered to fewer items', () => {
      const items1 = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, 15),
        { initialProps: { items: items1 } }
      )

      act(() => {
        result.current.setCurrentPage(3)
      })
      expect(result.current.currentPage).toBe(3)

      // Filter to 20 items (only 2 pages now)
      const items2 = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }))
      rerender({ items: items2 })
      // Should clamp to page 2
      expect(result.current.currentPage).toBe(2)
    })
  })

  describe('reset()', () => {
    it('should reset currentPage to 1', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setCurrentPage(3)
      })
      expect(result.current.currentPage).toBe(3)
      act(() => {
        result.current.reset()
      })
      expect(result.current.currentPage).toBe(1)
    })

    it('should reset pageSize to default', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      act(() => {
        result.current.setPageSize(25)
      })
      expect(result.current.pageSize).toBe(25)
      act(() => {
        result.current.reset()
      })
      expect(result.current.pageSize).toBe(15)
    })

    it('should reset both currentPage and pageSize', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 20))
      act(() => {
        result.current.setCurrentPage(3)
        result.current.setPageSize(10)
      })
      expect(result.current.currentPage).toBe(1) // pageSize change resets page
      expect(result.current.pageSize).toBe(10)
      act(() => {
        result.current.reset()
      })
      expect(result.current.currentPage).toBe(1)
      expect(result.current.pageSize).toBe(20)
    })
  })

  describe('totalPages Calculation', () => {
    it('should return 1 for empty items array', () => {
      const items: { id: string }[] = []
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
    })

    it('should return 1 for 1 item', () => {
      const items = [{ id: 'item-0' }]
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
    })

    it('should return 1 for 15 items with pageSize 15', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(1)
    })

    it('should return 2 for 16 items with pageSize 15', () => {
      const items = Array.from({ length: 16 }, (_, i) => ({ id: `item-${i}` }))
      const { result } = renderHook(() => usePagination(items, 15))
      expect(result.current.totalPages).toBe(2)
    })

    it('should return correct totalPages for various sizes', () => {
      const testCases = [
        { itemCount: 100, pageSize: 10, expected: 10 },
        { itemCount: 100, pageSize: 15, expected: 7 },
        { itemCount: 100, pageSize: 33, expected: 4 },
        { itemCount: 100, pageSize: 100, expected: 1 },
        { itemCount: 100, pageSize: 101, expected: 1 },
      ]

      testCases.forEach(({ itemCount, pageSize, expected }) => {
        const items = Array.from({ length: itemCount }, (_, i) => ({ id: `item-${i}` }))
        const { result } = renderHook(() => usePagination(items, pageSize))
        expect(result.current.totalPages).toBe(expected)
      })
    })
  })
})
