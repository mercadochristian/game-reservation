import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { QuickActionCard } from '../quick-action-card'

describe('QuickActionCard', () => {
  it('should render title and description', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Recent Registrations"
        description="View your latest registrations"
        stat="5 new"
        href="/dashboard/registrations"
      />
    )
    expect(screen.getByText('Recent Registrations')).toBeInTheDocument()
    expect(screen.getByText('View your latest registrations')).toBeInTheDocument()
  })

  it('should render stat text', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Test"
        description="Test card"
        stat="12 items"
        href="/dashboard/test"
      />
    )
    expect(screen.getByText('12 items')).toBeInTheDocument()
  })

  it('should render as a link to href', () => {
    render(
      <QuickActionCard
        icon={Users}
        title="Link Test Card"
        description="Test"
        stat="1"
        href="/dashboard/test"
      />
    )
    const link = screen.getByRole('link', { name: /Link Test Card/ })
    expect(link).toHaveAttribute('href', '/dashboard/test')
  })
})
