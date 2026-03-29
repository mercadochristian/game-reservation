// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import type { UserRole, SkillLevel } from '@/types'
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
    role: 'player' as UserRole,
    skill_level: 'intermediate' as SkillLevel,
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

  it('submits form with correct payload on save', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockUser }),
    })
    globalThis.fetch = mockFetch as any

    const mockOnSuccess = vi.fn()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={mockOnSuccess}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/users/${mockUser.id}`,
      expect.objectContaining({
        method: 'PATCH',
      })
    )
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'EMAIL_IN_USE', message: 'Email already in use' }),
    })
    globalThis.fetch = mockFetch as any

    const toastErrorSpy = vi.spyOn(toast, 'error')

    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(toastErrorSpy).toHaveBeenCalledWith('Email already in use')

    // Modal should remain open on error
    expect(screen.getByText('Edit User')).toBeInTheDocument()

    toastErrorSpy.mockRestore()
  })

  it('shows confirmation dialog when role changes', async () => {
    const user = userEvent.setup()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    // Change role dropdown
    const roleSelect = document.getElementById('role') as HTMLSelectElement
    await user.selectOptions(roleSelect, 'facilitator')

    // Click save
    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    // Confirmation dialog should appear
    expect(screen.getByText('Change Role?')).toBeInTheDocument()
  })

  it('submits on role change confirmation', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockUser, role: 'facilitator' }),
    })
    globalThis.fetch = mockFetch as any

    const mockOnSuccess = vi.fn()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={mockOnSuccess}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    // Change role
    const roleSelect = document.getElementById('role') as HTMLSelectElement
    await user.selectOptions(roleSelect, 'facilitator')

    // Click save to show confirmation
    let saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    // Confirmation should appear
    expect(screen.getByText('Change Role?')).toBeInTheDocument()

    // Click confirm on confirmation dialog
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    await user.click(confirmButton)

    // Should have submitted the form
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/users/${mockUser.id}`,
      expect.objectContaining({
        method: 'PATCH',
      })
    )
  })

  it('disables save button while submitting', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockUser,
              }),
            100
          )
        )
    )
    globalThis.fetch = mockFetch as any

    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    expect(saveButton).toBeDisabled()
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    globalThis.fetch = mockFetch as any

    const toastErrorSpy = vi.spyOn(toast, 'error')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await user.click(saveButton)

    expect(toastErrorSpy).toHaveBeenCalledWith('Something went wrong. Please try again.')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
    toastErrorSpy.mockRestore()
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = vi.fn()

    render(
      <EditUserModal
        isOpen={true}
        onClose={mockOnClose}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays user name in modal description', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={{ ...mockUser, first_name: 'Jane', last_name: 'Smith' }}
        currentUserRole="admin"
      />
    )

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })
})
