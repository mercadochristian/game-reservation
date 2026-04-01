import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentsFilterBar } from '../payments-filter-bar'

const baseProps = {
  locations: [],
  selectedLocationId: null,
  selectedDateRange: 'all' as const,
  selectedDate: null,
  onLocationChange: vi.fn(),
  onDateRangeChange: vi.fn(),
  onDateChange: vi.fn(),
}

describe('PaymentsFilterBar — AI Extraction badge', () => {
  it('should show "AI Extraction: ON" badge when extractionEnabled is true', () => {
    render(<PaymentsFilterBar {...baseProps} extractionEnabled={true} />)
    expect(screen.getByText('AI Extraction: ON')).toBeInTheDocument()
  })

  it('should show "AI Extraction: OFF" badge when extractionEnabled is false', () => {
    render(<PaymentsFilterBar {...baseProps} extractionEnabled={false} />)
    expect(screen.getByText('AI Extraction: OFF')).toBeInTheDocument()
  })
})
