# Edit User Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a centered dialog modal for editing user profiles with role-based field visibility, form validation, and role change confirmation.

**Architecture:** Single React component using React Hook Form + Zod validation. Conditional field rendering based on current user's role. Role changes trigger a confirmation dialog before submission. All errors display as Sonner toasts. Modal pre-fills with user data and closes on success.

**Tech Stack:** React 19, React Hook Form, Zod, @base-ui/react (Dialog), Sonner, TypeScript 5

---

## File Structure

### New Files
- **`src/app/dashboard/users/edit-user-modal.tsx`** — Modal component (form, validation, submission)
- **`src/app/dashboard/users/edit-user-modal.test.ts`** — Unit tests (rendering, validation, submission, errors)

### Existing Files (No changes needed)
- `src/lib/validations/user-edit.ts` — Validation schema (already exists)
- `src/lib/permissions/user-editing.ts` — Permission helpers (already exists)
- `src/components/ui/dialog.tsx` — Dialog primitives (already exists)

---

## Task 1: Component Skeleton & Types

**Files:**
- Create: `src/app/dashboard/users/edit-user-modal.tsx`
- Test: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Create test file with component rendering test**

Create `src/app/dashboard/users/edit-user-modal.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditUserModal } from './edit-user-modal'

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
    expect(dialog).not.toHaveAttribute('data-open')
  })
})
```

- [ ] **Step 2: Create component file with basic structure**

Create `src/app/dashboard/users/edit-user-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { UserRole } from '@/types'
import { userEditSchema, type UserEditData } from '@/lib/validations/user-edit'

interface UserRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  role: string
  skill_level: string | null
  player_contact_number: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_number: string | null
  is_guest: boolean
  created_at: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user: UserRow
  currentUserRole: UserRole
}

export function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  currentUserRole,
}: EditUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    getValues,
  } = useForm<UserEditData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      player_contact_number: user.player_contact_number || '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_relationship: user.emergency_contact_relationship || '',
      emergency_contact_number: user.emergency_contact_number || '',
      skill_level: user.skill_level || undefined,
      role: user.role as UserRole,
    },
  })

  const currentRole = watch('role')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(async (data) => {
          // Placeholder for submission logic
          console.log('Form submitted:', data)
        })}>
          <div className="space-y-4">
            {/* Form fields will be added in subsequent tasks */}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (2 tests passing)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: create edit-user-modal component skeleton with tests"
```

---

## Task 2: Form Fields & Field Visibility

**Files:**
- Modify: `src/app/dashboard/users/edit-user-modal.tsx`
- Modify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add test for field visibility by role**

Add to test file after existing tests:

```typescript
  it('shows all fields for admin', () => {
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    expect(screen.getByDisplayValue('John')).toBeInTheDocument() // first_name
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument() // email
    expect(screen.getByDisplayValue('555-0000')).toBeInTheDocument() // player_contact_number
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

    const skillLevelInput = screen.getByDisplayValue('intermediate')
    expect(skillLevelInput).not.toHaveAttribute('disabled')

    // Other fields should be disabled
    const firstNameInput = screen.getByDisplayValue('John')
    expect(firstNameInput).toHaveAttribute('disabled')
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
```

- [ ] **Step 2: Create helper function for field editability**

Add to `src/app/dashboard/users/edit-user-modal.tsx` before the component:

```typescript
function getEditableFields(userRole: UserRole): string[] {
  const baseFields = ['skill_level']

  if (userRole === 'super_admin' || userRole === 'admin') {
    return [
      'first_name',
      'last_name',
      'email',
      'player_contact_number',
      'emergency_contact_name',
      'emergency_contact_relationship',
      'emergency_contact_number',
      'skill_level',
      'role',
    ]
  }

  return baseFields
}

function isFieldEditable(fieldName: string, userRole: UserRole): boolean {
  return getEditableFields(userRole).includes(fieldName)
}
```

- [ ] **Step 3: Add form fields with conditional rendering and editability**

Replace the "Form fields will be added" comment in the component with:

```typescript
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                disabled={!isFieldEditable('first_name', currentUserRole)}
              />
              {errors.first_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.first_name.message}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                disabled={!isFieldEditable('last_name', currentUserRole)}
              />
              {errors.last_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.last_name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={!isFieldEditable('email', currentUserRole)}
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Player Contact Number */}
            <div>
              <Label htmlFor="player_contact_number">Phone Number</Label>
              <Input
                id="player_contact_number"
                {...register('player_contact_number')}
                disabled={!isFieldEditable('player_contact_number', currentUserRole)}
              />
              {errors.player_contact_number && (
                <p className="text-destructive text-sm mt-1">
                  {errors.player_contact_number.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Name */}
            <div>
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                {...register('emergency_contact_name')}
                disabled={!isFieldEditable('emergency_contact_name', currentUserRole)}
              />
              {errors.emergency_contact_name && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_name.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Relationship */}
            <div>
              <Label htmlFor="emergency_contact_relationship">Relationship</Label>
              <Input
                id="emergency_contact_relationship"
                {...register('emergency_contact_relationship')}
                disabled={!isFieldEditable('emergency_contact_relationship', currentUserRole)}
              />
              {errors.emergency_contact_relationship && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_relationship.message}
                </p>
              )}
            </div>

            {/* Emergency Contact Number */}
            <div>
              <Label htmlFor="emergency_contact_number">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_number"
                {...register('emergency_contact_number')}
                disabled={!isFieldEditable('emergency_contact_number', currentUserRole)}
              />
              {errors.emergency_contact_number && (
                <p className="text-destructive text-sm mt-1">
                  {errors.emergency_contact_number.message}
                </p>
              )}
            </div>

            {/* Skill Level */}
            <div>
              <Label htmlFor="skill_level">Skill Level</Label>
              <select
                id="skill_level"
                {...register('skill_level')}
                disabled={!isFieldEditable('skill_level', currentUserRole)}
                className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-background disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">None</option>
                <option value="developmental">Developmental</option>
                <option value="developmental_plus">Developmental+</option>
                <option value="intermediate">Intermediate</option>
                <option value="intermediate_plus">Intermediate+</option>
                <option value="advanced">Advanced</option>
              </select>
              {errors.skill_level && (
                <p className="text-destructive text-sm mt-1">
                  {errors.skill_level.message}
                </p>
              )}
            </div>

            {/* Role - only show for super_admin and admin */}
            {isFieldEditable('role', currentUserRole) && (
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="w-full px-3 py-2 rounded-lg border border-foreground/20 bg-background"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="facilitator">Facilitator</option>
                  <option value="player">Player</option>
                </select>
                {errors.role && (
                  <p className="text-destructive text-sm mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>
            )}
          </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (5 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: add form fields with role-based visibility and editability"
```

---

## Task 3: Form Submission & API Integration

**Files:**
- Modify: `src/app/dashboard/users/edit-user-modal.tsx`
- Modify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add test for successful form submission**

Add to test file:

```typescript
  it('submits form with correct payload on save', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: mockUser.id, ...mockUser }),
    })
    global.fetch = mockFetch

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

    const saveButton = screen.getByText('Save')
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
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'EMAIL_IN_USE', message: 'Email already in use' }),
    })
    global.fetch = mockFetch

    const toastSpy = vi.spyOn({ toast }, 'error', 'get')

    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Modal should remain open on error
    expect(screen.getByText('Edit User')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Implement form submission handler**

Replace the `handleSubmit` inline function with a proper handler function. Add this before the return statement:

```typescript
  const onFormSubmit = async (data: UserEditData) => {
    // If role is changing, show confirmation first
    if (data.role && data.role !== user.role) {
      setPendingRole(data.role)
      setShowRoleConfirm(true)
      return
    }

    // Otherwise submit immediately
    await submitForm(data)
  }

  const submitForm = async (data: UserEditData) => {
    setIsSubmitting(true)
    try {
      const editableFields = getEditableFields(currentUserRole)
      const payload: Partial<UserEditData> = {}

      // Only include editable fields
      for (const field of editableFields) {
        if (field in data) {
          payload[field as keyof UserEditData] = data[field as keyof UserEditData]
        }
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.message || 'Failed to update user')
        return
      }

      toast.success('User updated successfully')
      onSuccess?.()
      onClose()
      reset()
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
```

- [ ] **Step 3: Update form submission to use new handler**

Change the form's `onSubmit` from:

```typescript
onSubmit={handleSubmit(async (data) => {
  // Placeholder for submission logic
  console.log('Form submitted:', data)
})}
```

To:

```typescript
onSubmit={handleSubmit(onFormSubmit)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (7 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: implement form submission with API integration"
```

---

## Task 4: Role Change Confirmation Dialog

**Files:**
- Modify: `src/app/dashboard/users/edit-user-modal.tsx`
- Modify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add test for role change confirmation**

Add to test file:

```typescript
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
    const roleSelect = screen.getByDisplayValue('Player')
    await user.selectOptions(roleSelect, 'Facilitator')

    // Click save
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Confirmation dialog should appear
    expect(screen.getByText(/Change Role\?/)).toBeInTheDocument()
    expect(screen.getByText(/Player to Facilitator/)).toBeInTheDocument()
  })

  it('cancels role change on confirmation dialog cancel', async () => {
    const user = userEvent.setup()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    // Change role
    const roleSelect = screen.getByDisplayValue('Player')
    await user.selectOptions(roleSelect, 'Facilitator')

    // Click save to show confirmation
    let saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Click cancel on confirmation
    const cancelConfirmButton = screen.getByRole('button', { name: /Cancel/ })
    await user.click(cancelConfirmButton)

    // Confirmation should be dismissed, modal still open
    expect(screen.queryByText(/Change Role\?/)).not.toBeInTheDocument()
    expect(screen.getByText('Edit User')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Add confirmation dialog component to the modal**

Add this after the closing `</form>` tag but before `</Dialog>`:

```typescript
      {/* Role Change Confirmation Dialog */}
      <Dialog open={showRoleConfirm} onOpenChange={(open) => {
        if (!open) {
          setShowRoleConfirm(false)
          setPendingRole(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Change {user.first_name} {user.last_name}'s role from{' '}
            <span className="font-medium text-foreground">{user.role}</span> to{' '}
            <span className="font-medium text-foreground">{pendingRole}</span>?
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRoleConfirm(false)
                setPendingRole(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const data = getValues()
                setShowRoleConfirm(false)
                setPendingRole(null)
                await submitForm(data)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (9 tests passing)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: add role change confirmation dialog"
```

---

## Task 5: Error Handling & Edge Cases

**Files:**
- Modify: `src/app/dashboard/users/edit-user-modal.tsx`
- Modify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add tests for error scenarios**

Add to test file:

```typescript
  it('handles SELF_DEMOTION error from API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'SELF_DEMOTION',
        message: 'You cannot change your own role',
      }),
    })
    global.fetch = mockFetch

    const toastErrorSpy = vi.spyOn(toast, 'error')

    const user = userEvent.setup()
    const { rerender } = render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={{ ...mockUser, role: 'admin' }}
        currentUserRole="admin"
      />
    )

    // Try to change own role
    const roleSelect = screen.getByDisplayValue('Admin')
    await user.selectOptions(roleSelect, 'Player')

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Confirmation should appear
    expect(screen.getByText(/Change Role\?/)).toBeInTheDocument()

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    await user.click(confirmButton)

    // Error should be shown
    expect(toastErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('cannot change your own role')
    )

    // Modal should remain open
    expect(screen.getByText('Edit User')).toBeInTheDocument()
  })

  it('handles EMAIL_IN_USE error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'EMAIL_IN_USE',
        message: 'This email is already in use',
      }),
    })
    global.fetch = mockFetch

    const toastErrorSpy = vi.spyOn(toast, 'error')

    const user = userEvent.setup()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const emailInput = screen.getByDisplayValue('john@example.com')
    await user.clear(emailInput)
    await user.type(emailInput, 'taken@example.com')

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    expect(toastErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('already in use')
    )
  })

  it('disables save button while submitting', async () => {
    const mockFetch = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => mockUser,
      }), 100))
    )
    global.fetch = mockFetch

    const user = userEvent.setup()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByText('Save') as HTMLButtonElement
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    expect(saveButton).toBeDisabled()
  })

  it('handles network errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const toastErrorSpy = vi.spyOn(toast, 'error')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const user = userEvent.setup()
    render(
      <EditUserModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        currentUserRole="admin"
      />
    )

    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    expect(toastErrorSpy).toHaveBeenCalledWith(
      'Something went wrong. Please try again.'
    )
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
```

- [ ] **Step 2: Ensure error handling is robust**

Review the `submitForm` function (added in Task 3) to ensure:
- Try-catch wraps the entire submission
- Network errors are caught and shown as generic message
- API errors are parsed and shown as specific messages
- Modal remains open on any error

The current implementation already handles this, so no changes needed.

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (13 tests passing)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: add comprehensive error handling and edge case tests"
```

---

## Task 6: Refinements & Final Tests

**Files:**
- Modify: `src/app/dashboard/users/edit-user-modal.tsx`
- Modify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add test for close button behavior**

Add to test file:

```typescript
  it('calls onClose when X button is clicked', async () => {
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

    const closeButton = screen.getByRole('button', { name: /Close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
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
```

- [ ] **Step 2: Verify all form fields have proper labels and accessibility**

Check the component to ensure:
- All inputs have `htmlFor` labels that match `id`
- Error messages are associated with fields (use aria-describedby if needed)
- Dialog has proper `DialogTitle` and `DialogDescription`

Current implementation already has labels and descriptions, so no changes needed.

- [ ] **Step 3: Run full test suite to ensure no regressions**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (16 tests passing)

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Run linter**

```bash
npm run lint
```

Expected: No errors in edit-user-modal files

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "feat: finalize edit-user-modal with accessibility and refinements"
```

---

## Task 7: Documentation & Code Review

**Files:**
- No new files
- Verify: `src/app/dashboard/users/edit-user-modal.tsx`
- Verify: `src/app/dashboard/users/edit-user-modal.test.ts`

- [ ] **Step 1: Add JSDoc comments to component**

Add at the top of the component function:

```typescript
/**
 * Modal for editing user profiles with role-based field visibility.
 *
 * Super Admin/Admin can edit all fields including role. Role changes
 * require a confirmation dialog. Facilitators can only edit skill_level.
 * All other fields are visible but read-only for non-super/admin users.
 *
 * Form validation errors display inline under each field. API errors
 * display as Sonner toasts. Modal stays open on error, closes on success.
 *
 * @param props - Component props
 * @returns EditUserModal component
 */
```

- [ ] **Step 2: Verify code patterns match existing codebase**

Check:
- Form validation matches `src/lib/validations/user-edit.ts` schema ✓
- Dialog components match `src/components/ui/dialog.tsx` usage ✓
- Toast usage matches Sonner pattern throughout codebase ✓
- TypeScript types match `src/types/index.ts` ✓
- Color/styling uses Tailwind from existing design system ✓

- [ ] **Step 3: Run the complete test suite one final time**

```bash
npm test -- edit-user-modal.test.ts --run
```

Expected: PASS (16 tests passing)

- [ ] **Step 4: Create a simple integration check**

Open the component in your IDE and verify:
- All imports resolve (no red squiggles)
- TypeScript types are correct
- Functions are properly typed
- No unused variables or imports

- [ ] **Step 5: Final commit**

```bash
git add src/app/dashboard/users/edit-user-modal.tsx src/app/dashboard/users/edit-user-modal.test.ts
git commit -m "docs: add JSDoc comments to edit-user-modal component"
```

---

## Task 8: Manual Testing

**Files:**
- Manual verification only

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: Server running at `http://localhost:3000`

- [ ] **Step 2: Navigate to users page**

Open browser to `http://localhost:3000/dashboard/users`

Expected: Users table loads

- [ ] **Step 3: Verify modal can be instantiated**

In browser console, verify the component can render (prepare for Task 8 integration):

```javascript
// Just verify the app loads without errors
console.log('App loaded')
```

- [ ] **Step 4: Verify responsive behavior**

- Desktop (1024px+): Modal appears centered with good spacing
- Tablet (768px-1024px): Modal remains readable with padding
- Mobile (< 768px): Modal uses available width with margins

- [ ] **Step 5: No errors in console**

Verify browser DevTools console shows no errors related to the modal component.

---

## Summary

**What was built:**
- ✅ `EditUserModal` component with role-based field visibility
- ✅ Form validation with inline error display
- ✅ Role change confirmation dialog
- ✅ API integration with error handling
- ✅ 16 comprehensive unit tests
- ✅ TypeScript types and JSDoc documentation

**Test coverage:** 16 tests covering rendering, validation, submission, errors, and edge cases

**Code quality:** TypeScript strict mode, linting, accessibility best practices

**Ready for:** Task 8 (Edit button in users table integration) and Task 9 (Middleware verification)

