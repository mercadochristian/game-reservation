// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegistrationsFilterBar } from '../registrations-filter-bar'
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

describe('RegistrationsFilterBar', () => {
  beforeEach(() => {
    // Clean up between tests
  })

  it('should render location and date range selects', () => {
    render(
      <RegistrationsFilterBar
        locations={mockLocations}
        selectedLocationId=""
        selectedDateRange="all"
        totalRegistrations={0}
        onLocationChange={() => {}}
        onDateRangeChange={() => {}}
      />
    )
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes).toHaveLength(2)
  })

  it('should render all location options when dropdown is opened', async () => {
    const user = userEvent.setup()
    render(
      <RegistrationsFilterBar
        locations={mockLocations}
        selectedLocationId=""
        selectedDateRange="all"
        totalRegistrations={0}
        onLocationChange={() => {}}
        onDateRangeChange={() => {}}
      />
    )
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[0])
    await waitFor(() => {
      expect(screen.getByText('North Court')).toBeInTheDocument()
      expect(screen.getByText('South Court')).toBeInTheDocument()
    })
  })

  it('should display total registrations count when location is selected', () => {
    render(
      <RegistrationsFilterBar
        locations={mockLocations}
        selectedLocationId="loc-1"
        selectedDateRange="all"
        totalRegistrations={25}
        onLocationChange={() => {}}
        onDateRangeChange={() => {}}
      />
    )
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('registrations total')).toBeInTheDocument()
  })


  it('should render all date range options when dropdown is opened', async () => {
    const user = userEvent.setup()
    render(
      <RegistrationsFilterBar
        locations={mockLocations}
        selectedLocationId="loc-1"
        selectedDateRange="all"
        totalRegistrations={0}
        onLocationChange={() => {}}
        onDateRangeChange={() => {}}
      />
    )
    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[1])
    await waitFor(() => {
      expect(screen.queryByText('All')).toBeInTheDocument()
      expect(screen.queryByText('Last 7 Days')).toBeInTheDocument()
      expect(screen.queryByText('Last 30 Days')).toBeInTheDocument()
    })
  })
})
