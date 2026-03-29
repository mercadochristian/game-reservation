'use client'

import { useState, useCallback, useMemo } from 'react'

const DEFAULT_PAGE_SIZE = 15

/**
 * Pagination state
 */
export interface PaginationState {
  /** Current page (1-indexed) */
  currentPage: number
  /** Items per page */
  pageSize: number
}

/**
 * Pagination handler functions
 */
export interface PaginationHandlers {
  /** Navigate to a specific page (1-indexed) */
  setCurrentPage: (page: number) => void
  /** Change items per page; resets to page 1 */
  setPageSize: (size: number) => void
  /** Reset pagination to initial state */
  reset: () => void
}

/**
 * Combined return type from usePagination hook
 */
export interface UsePaginationReturn<T> extends PaginationState, PaginationHandlers {
  /** Slice of items for current page */
  paginatedItems: T[]
  /** Total number of pages based on items */
  totalPages: number
  /** Helper: true if not on first page */
  hasPreviousPage: boolean
  /** Helper: true if not on last page */
  hasNextPage: boolean
}

/**
 * Hook for managing pagination state and logic.
 *
 * Accepts a full array of items (typically filtered) and manages:
 * - Current page navigation
 * - Page size changes
 * - Slicing items for the current page
 * - Computed pagination helpers
 *
 * @param items - Array of items to paginate (typically filtered items)
 * @param defaultPageSize - Items per page (default: 15)
 * @returns Pagination state, handlers, and computed values
 *
 * @example
 * const { currentPage, pageSize, paginatedItems, totalPages, hasNextPage, setCurrentPage } = usePagination(items, 15)
 *
 * // Render items
 * {paginatedItems.map(item => <Item key={item.id} {...item} />)}
 *
 * // Render pagination controls
 * <button onClick={() => setCurrentPage(currentPage - 1)} disabled={!hasPreviousPage}>
 *   Previous
 * </button>
 */
export function usePagination<T>(items: T[], defaultPageSize: number = DEFAULT_PAGE_SIZE): UsePaginationReturn<T> {
  const [currentPage, setCurrentPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  // Clamp current page to valid range
  const validPage = useMemo(() => {
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize))
    return Math.min(Math.max(currentPage, 1), maxPage)
  }, [currentPage, items.length, pageSize])

  // Compute paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (validPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return items.slice(startIndex, endIndex)
  }, [items, validPage, pageSize])

  // Compute total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / pageSize))
  }, [items.length, pageSize])

  const hasPreviousPage = validPage > 1
  const hasNextPage = validPage < totalPages

  const setCurrentPage = useCallback((page: number) => {
    const pageNum = Math.max(1, Math.floor(page))
    setCurrentPageState(pageNum)
  }, [])

  const setPageSize = useCallback((size: number) => {
    const sizeNum = Math.max(1, Math.floor(size))
    setPageSizeState(sizeNum)
    setCurrentPageState(1) // Reset to page 1 when page size changes
  }, [])

  const reset = useCallback(() => {
    setCurrentPageState(1)
    setPageSizeState(defaultPageSize)
  }, [defaultPageSize])

  return {
    currentPage: validPage,
    pageSize,
    paginatedItems,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    setCurrentPage,
    setPageSize,
    reset,
  }
}
