import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditUserModal } from '../edit-user-modal'

describe('EditUserModal', () => {
  const mockUser = {
    id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'player',
    skill_level: 'intermediate',
    player_contact_number: '555-0000',
    emergency_contact_name: null,
    emergency_contact_relationship: null,
    emergency_contact_number: null,
    is_guest: false,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('renders modal with title when open', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    expect(screen.getByText('Edit User')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('does not render modal when closed', () => {
    const { container } = render(
      <EditUserModal
        isOpen={false}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    // Dialog should not be visible in DOM when closed
    const dialog = container.querySelector('[data-slot="dialog-content"]')
    expect(dialog).toBeNull()
  })
})
