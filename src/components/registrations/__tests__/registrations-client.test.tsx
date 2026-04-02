// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegistrationsClient } from '../registrations-client'
import type { Location } from '@/types'

const mockLocations: Location[] = [
  {
    id: 'loc-1',
    name: 'North Court',
    address: '123 Main St',
    google_map_url: null,
    notes: null,
    is_active: true,
    created_by: 'user-1',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'loc-2',
    name: 'South Court',
    address: '456 Park Ave',
    google_map_url: null,
    notes: null,
    is_active: true,
    created_by: 'user-1',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

describe('RegistrationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render filter bar with locations', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)
    expect(screen.getByText(/Location/)).toBeInTheDocument()
  })

  it('should show initial empty state', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)
    expect(screen.queryAllByText(/Select a location to view games and registrations/)).not.toHaveLength(0)
  })

  it('should render page header with title', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should render without errors', () => {
    const { container } = render(
      <RegistrationsClient locations={mockLocations} userRole="admin" />
    )
    // Component should render without errors
    expect(container).toBeTruthy()
  })
})
