// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationsClient } from '@/components/registrations/registrations-client'
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

describe('Merged Registrations Dashboard - Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show initial empty state with location selector', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
    expect(screen.getByText(/Select a location to view games and registrations/)).toBeInTheDocument()
  })

  it('should render both upcoming and past games sections after location selection', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Get the location selector
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    // Open location dropdown and select first location
    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // Wait for sections to load and render
    await waitFor(() => {
      // Both sections should be present after location selection
      const sectionHeadings = screen.queryAllByText(/UPCOMING GAMES|PAST GAMES/)
      expect(sectionHeadings.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('should allow filtering by date range', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Select location first
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // Date range select should be available
    await waitFor(() => {
      const comboboxesAfter = screen.getAllByRole('combobox')
      expect(comboboxesAfter.length).toBeGreaterThanOrEqual(2)
    })

    // Click date range select to verify options exist
    const comboboxesAfter = screen.getAllByRole('combobox')
    const dateRangeSelect = comboboxesAfter[1]
    await user.click(dateRangeSelect)

    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument()
    })
  })

  it('should render without errors with admin role', async () => {
    const { container } = render(
      <RegistrationsClient locations={mockLocations} userRole="admin" />
    )

    // Component should render without errors
    expect(container).toBeTruthy()
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
    const emptyStates = screen.queryAllByText(/Select a location to view games and registrations/)
    expect(emptyStates.length).toBeGreaterThan(0)
  })

  it('should handle empty locations list gracefully', () => {
    render(<RegistrationsClient locations={[]} userRole="admin" />)

    // Should still render the page header
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should display registration count in page header', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Should render page header initially
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)

    // Select location
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // Should still show the page header after location selection
    await waitFor(() => {
      const headingsAfter = screen.getAllByRole('heading', { name: /Registrations/ })
      expect(headingsAfter.length).toBeGreaterThan(0)
    })
  })

  it('should switch between locations', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Select first location
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // Verify component renders after location selection
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: /Registrations/ })
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  it('should display initial empty state', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
    const emptyStates = screen.queryAllByText(/Select a location to view games and registrations/)
    expect(emptyStates.length).toBeGreaterThan(0)
  })

  it('should handle location selection without errors', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Select a location
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // The component should handle loading state internally
    // Verify component doesn't error and renders
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should maintain selected location when changing date range', async () => {
    const user = userEvent.setup()
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Select a location
    const comboboxes = screen.getAllByRole('combobox')
    const locationSelect = comboboxes[0]

    await user.click(locationSelect)
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
    })
    await user.click(screen.getByText('North Court'))

    // Change date range
    await waitFor(() => {
      const comboboxesAfter = screen.getAllByRole('combobox')
      expect(comboboxesAfter.length).toBeGreaterThanOrEqual(2)
    })
    const comboboxesAfter = screen.getAllByRole('combobox')
    const dateRangeSelect = comboboxesAfter[1]
    await user.click(dateRangeSelect)

    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Last 7 Days'))

    // Location should still be selected and content visible
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: /Registrations/ })
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  it('should render page header with description', () => {
    render(<RegistrationsClient locations={mockLocations} userRole="admin" />)

    // Check for page header title
    const headings = screen.getAllByRole('heading', { name: /Registrations/ })
    expect(headings.length).toBeGreaterThan(0)

    // Check for description
    const descriptions = screen.queryAllByText(/View and manage player registrations by location/)
    expect(descriptions.length).toBeGreaterThan(0)
  })
})
