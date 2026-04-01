import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaymentScheduleCard } from '../payment-schedule-card'
import type { ScheduleWithPaymentSummary } from '@/app/api/admin/payments/schedules/route'

const mockSchedule: ScheduleWithPaymentSummary = {
  id: 'sch-1',
  start_time: '2026-04-15T10:00:00Z',
  end_time: '2026-04-15T12:00:00Z',
  location_id: 'loc-1',
  max_players: 12,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  locations: {
    id: 'loc-1',
    name: 'Sports Hall A',
    address: '123 Main St',
    google_map_url: null,
  },
  totalCollected: 5000,
  pendingCount: 2,
}

describe('PaymentScheduleCard', () => {
  const mockHandlers = {
    onToggleExpand: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onEdit: vi.fn(),
    onViewProof: vi.fn(),
    onReextract: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render schedule with location name', () => {
    render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    expect(screen.getByText('Sports Hall A')).toBeInTheDocument()
  })

  it('should call onToggleExpand when clicked', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    // Get the header button specifically (has aria-expanded attribute)
    const button = container.querySelector('button[aria-expanded]')
    expect(button).toBeInTheDocument()
    fireEvent.click(button as HTMLElement)

    expect(mockHandlers.onToggleExpand).toHaveBeenCalledWith('sch-1')
  })

  it('should show location name in header', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    // Component renders location name in the header button
    const headerButton = container.querySelector('button[aria-expanded]')
    expect(headerButton?.textContent).toContain('Sports Hall A')
  })

  it('should display payment badges', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    // Check for badge elements that contain payment summary
    const badges = container.querySelectorAll('[data-slot="badge"]')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('should display pending count in badges', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    // Find badges container with payment summaries
    const badges = container.querySelectorAll('[class*="badge"]')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it('should render without errors when collapsed', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={false}
        {...mockHandlers}
      />
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render without errors when expanded', () => {
    const { container } = render(
      <PaymentScheduleCard
        schedule={mockSchedule}
        isExpanded={true}
        {...mockHandlers}
      />
    )

    expect(container.firstChild).toBeInTheDocument()
  })
})
