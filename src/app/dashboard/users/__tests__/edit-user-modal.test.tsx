// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EditUserModal } from '../edit-user-modal'

afterEach(() => {
  cleanup()
})

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

  it('shows all fields for admin', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    // Find the email field by id to avoid duplicates in StrictMode
    const emailInput = document.getElementById('email') as HTMLInputElement
    expect(emailInput).toBeInTheDocument()
    expect(emailInput.value).toBe('john@example.com')

    expect(screen.getByLabelText('First Name')).toBeInTheDocument() // use label to find field
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
  })

  it('shows only skill_level editable for facilitator', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="facilitator"
      />
    )

    const skillLevelInput = document.getElementById('skill_level') as HTMLSelectElement
    expect(skillLevelInput).not.toHaveAttribute('disabled')

    // Other fields should be disabled
    const firstNameInput = document.getElementById('first_name') as HTMLInputElement
    expect(firstNameInput.hasAttribute('disabled')).toBe(true)
  })

  it('does not show role field for facilitator', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={{ ...mockUser, role: 'player' }}
        currentUserRole="facilitator"
      />
    )

    // Role label/dropdown should not exist
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
  })

  it('shows role field for super_admin', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="super_admin"
      />
    )

    // Role dropdown should be visible for super_admin
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
    const roleSelect = document.getElementById('role') as HTMLSelectElement
    expect(roleSelect).toBeInTheDocument()
  })

  it('disables all fields for player role viewing another user', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="player"
      />
    )

    // All fields should be disabled for player
    const firstNameInput = document.getElementById('first_name') as HTMLInputElement
    expect(firstNameInput.hasAttribute('disabled')).toBe(true)

    const skillLevelSelect = document.getElementById('skill_level') as HTMLSelectElement
    expect(skillLevelSelect.hasAttribute('disabled')).toBe(true)

    // Role field should not exist for player
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
  })
})
