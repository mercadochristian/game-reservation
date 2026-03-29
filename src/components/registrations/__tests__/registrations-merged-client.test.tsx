// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegistrationsMergedClient } from '../registrations-merged-client'
import type { Location } from '@/types'

const mockLocations: Location[] = [
  { id: 'loc-1', name: 'North Court', address: '123 Main St', google_map_url: null },
  { id: 'loc-2', name: 'South Court', address: '456 Park Ave', google_map_url: null },
]

describe('RegistrationsMergedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render filter bar with locations', () => {
    render(<RegistrationsMergedClient locations={mockLocations} userRole="admin" />)
    expect(screen.getByText(/Location/)).toBeInTheDocument()
  })

  it('should show initial empty state', () => {
    render(<RegistrationsMergedClient locations={mockLocations} userRole="admin" />)
    expect(screen.queryAllByText(/Select a location to view games and registrations/)).not.toHaveLength(0)
  })

  it('should render page header with title', () => {
    render(<RegistrationsMergedClient locations={mockLocations} userRole="admin" />)
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should handle facilitator role', () => {
    const { container } = render(
      <RegistrationsMergedClient locations={mockLocations} userRole="facilitator" />
    )
    // Component should render without errors for facilitator role
    expect(container).toBeTruthy()
  })
})
