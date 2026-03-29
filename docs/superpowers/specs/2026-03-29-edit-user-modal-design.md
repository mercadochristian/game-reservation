# Edit User Modal Design Spec

**Project:** Volleyball Game Reservation System
**Feature:** User Editing Modal (Task 7 of 10)
**Date:** 2026-03-29
**Status:** Design approved, ready for implementation

---

## Overview

The Edit User Modal is a centered dialog component that allows Super Admins, Admins, and Facilitators to edit user profiles with role-based field visibility and editability. The modal pre-fills user data, validates input client-side, and submits to `PATCH /api/users/[userId]` with proper error handling and confirmation for role changes.

**Scope:** Modal component only. Integration with users table (edit button) is Task 8.

---

## Component Specification

### Props & State

```typescript
interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user: UserRow  // From users table (id, first_name, last_name, email, role, skill_level, player_contact_number, etc.)
  currentUserRole: UserRole  // Current logged-in user's role for permission checks
}
```

**Internal state:**
- Form state: React Hook Form manages all field values and validation
- `showRoleConfirm: boolean` — visibility of role change confirmation dialog
- `pendingRole: string | null` — role being confirmed (cleared on cancel/submit)
- `isSubmitting: boolean` — button loading state during API call

### Modal Structure

**File location:** `src/app/dashboard/users/edit-user-modal.tsx`

**Composition:**
```
Dialog (Root)
├── DialogOverlay
├── DialogContent
│   ├── DialogHeader
│   │   ├── DialogTitle: "Edit User"
│   │   └── DialogDescription: "[User Name]"
│   ├── Form (React Hook Form)
│   │   ├── FormField[first_name] (conditionally editable)
│   │   ├── FormField[last_name] (conditionally editable)
│   │   ├── FormField[email] (conditionally editable)
│   │   ├── FormField[player_contact_number] (conditionally editable)
│   │   ├── FormField[emergency_contact_name] (conditionally editable)
│   │   ├── FormField[emergency_contact_relationship] (conditionally editable)
│   │   ├── FormField[emergency_contact_number] (conditionally editable)
│   │   ├── FormField[skill_level] (conditionally editable)
│   │   ├── FormField[role] (conditionally editable, Super Admin/Admin only)
│   │   └── RoleChangeConfirmation Dialog (nested)
│   └── DialogFooter
│       ├── Cancel button
│       └── Save button (disabled during submission)
└── Error toast (Sonner)
```

---

## Field Visibility & Editability Rules

### By Role

| Field | Super Admin | Admin | Facilitator | Player |
|-------|------------|-------|------------|--------|
| `first_name` | ✏️ Edit | ✏️ Edit | 🔒 Read-only | 🔒 Read-only |
| `last_name` | ✏️ Edit | ✏️ Edit | 🔒 Read-only | 🔒 Read-only |
| `email` | ✏️ Edit | ✏️ Edit | 🔒 Read-only | 🔒 Read-only |
| `player_contact_number` | ✏️ Edit | ✏️ Edit | 🔒 Read-only | 🔒 Read-only |
| `emergency_contact_*` | ✏️ Edit | ✏️ Edit | 🔒 Read-only | 🔒 Read-only |
| `skill_level` | ✏️ Edit | ✏️ Edit | ✏️ Edit | 🔒 Read-only |
| `role` | ✏️ Edit | ✏️ Edit | ❌ Hidden | ❌ Hidden |

### Implementation

**Helper function:** `getEditableFields(userRole: UserRole): string[]`
- Returns array of field names the current user can edit
- Used to determine which inputs are `disabled={false}` vs `disabled={true}`

**Read-only styling:**
- Disabled inputs: `opacity-60`, `cursor-not-allowed`, `bg-muted`
- Text indicator (optional): "Read-only" badge or muted text below field label
- User sees the data but understands they cannot change it

---

## Form Validation & Error Handling

### Schema

Use existing `userEditSchema` from `src/lib/validations/user-edit.ts`:
- `first_name`: string, min 1, max 100, nullable
- `last_name`: string, min 1, max 100, nullable
- `email`: valid email, min 1, max 255, optional
- `player_contact_number`: max 20, nullable
- `emergency_contact_name`: max 100, nullable
- `emergency_contact_relationship`: max 50, nullable
- `emergency_contact_number`: max 20, nullable
- `skill_level`: enum of valid levels, nullable
- `role`: enum of valid roles, optional

### Frontend Validation

**Trigger:** onChange (loose validation) + onBlur (strict validation)

**Error display:** Inline error message under each field
- Red text, small font
- Clear, actionable message (e.g., "First name cannot be blank")
- Cleared on valid input

### Backend Error Handling

**All API errors display as toast summary (Sonner):**

| Error Code | Message | Behavior |
|-----------|---------|----------|
| `INVALID_INPUT` | "Please fix the errors in the form" | Toast + highlight fields |
| `EMAIL_IN_USE` | "This email is already in use" | Toast + highlight email field |
| `INVALID_ROLE` | "You cannot assign this role" | Toast |
| `SELF_DEMOTION` | "You cannot change your own role" | Toast + keep modal open |
| `PERMISSION_DENIED` | "You don't have permission to edit this field" | Toast |
| `NOT_FOUND` | "User not found" | Toast + close modal |
| `SERVER_ERROR` | "Something went wrong. Please try again." | Toast |

**Error style:** `toast.error(message, { duration: 5000 })`

---

## Role Change Confirmation Dialog

### When to Show

User attempts to submit the form AND `role` field has changed (new role ≠ current user's role)

**Pseudocode:**
```typescript
const onFormSubmit = (data: UserEditData) => {
  if (data.role && data.role !== user.role) {
    // Show confirmation instead of submitting
    setPendingRole(data.role)
    setShowRoleConfirm(true)
    return
  }
  // Otherwise submit immediately
  submitForm(data)
}
```

### Dialog Content

```
Title: "Change Role?"
Body: "Change [firstName lastName]'s role from [oldRole] to [newRole]?"
Buttons:
  - "Cancel" (closes confirmation, keeps main form open)
  - "Confirm" (submits the form)
```

### Behavior

- **On Confirm:** Submit form with pending role
  - Success: toast.success + close modal
  - Error: toast.error + keep modal open
  - SELF_DEMOTION error: caught before this dialog (API returns 400)
- **On Cancel:** Dismiss dialog, form stays as-is, user can continue editing

---

## Form Submission Flow

```
User clicks Save
  ↓
Validate with React Hook Form
  ↓
Show inline errors? → YES: Stop, let user fix
                   ↓ NO
Role changing? → YES: Show confirmation dialog
              ↓ NO
              Submit form

On confirmation or no-role-change submit:
  POST to PATCH /api/users/[userId]
  ↓
Success?
  ↓ YES
  toast.success("User updated")
  onSuccess() callback
  Close modal

  ↓ NO (error response)
  toast.error(error.message)
  Keep modal open
  Highlight error fields if applicable
```

---

## Data Flow & Props

### Parent → Modal

```typescript
<EditUserModal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  onSuccess={() => {
    // Refresh users table, invalidate cache, etc.
    refetchUsers()
  }}
  user={selectedUser}  // Pre-fill form
  currentUserRole={userRole}  // Determine field visibility
/>
```

### Modal → Parent

- `onClose()` — called when user clicks X or Cancel
- `onSuccess()` — called after successful save
- No return value; all state managed internally

### API Payload

Only send editable fields to the API. Filter out read-only fields.

```typescript
const editableFields = getEditableFields(currentUserRole)
const payload = {
  ...(editableFields.includes('first_name') && { first_name: data.first_name }),
  ...(editableFields.includes('last_name') && { last_name: data.last_name }),
  // ... etc
}

const response = await fetch(`/api/users/${user.id}`, {
  method: 'PATCH',
  body: JSON.stringify(payload)
})
```

---

## UI & Styling

### Design Tokens

- **Dialog**: Centered overlay, `max-w-sm` (384px), dark mode first
- **Inputs**: Use existing `<Input />` component from `@/components/ui/input`
- **Labels**: Use existing `<Label />` component from `@/components/ui/label`
- **Buttons**: `<Button variant="default" />` (Save), `<Button variant="outline" />` (Cancel)
- **Error text**: `text-destructive text-sm` (red, small)
- **Disabled inputs**: `opacity-60 cursor-not-allowed`
- **Field spacing**: `gap-4` (consistent with form standards)

### Mobile Responsiveness

Dialog already handles mobile via `max-w-[calc(100%-2rem)]` in DialogContent. Form scales naturally:
- Single column layout (naturally stacked)
- Full-width inputs with padding
- Buttons stack on very small screens

---

## Testing Strategy

**File location:** `src/app/dashboard/users/edit-user-modal.test.ts`

**Test categories:**

### Rendering & Setup
- ✅ Modal renders when `isOpen={true}`
- ✅ Modal hidden when `isOpen={false}`
- ✅ Form pre-fills with user data

### Field Visibility by Role
- ✅ Super Admin sees all fields + role dropdown
- ✅ Admin sees all fields + role dropdown (but not super_admin option)
- ✅ Facilitator sees all fields but only skill_level is editable (others disabled)
- ✅ Disabled fields show muted styling

### Validation & Errors
- ✅ Required field validation triggers on blur
- ✅ Email validation (invalid email shows error)
- ✅ Character length validation (max limits enforced)
- ✅ Errors clear when user corrects input
- ✅ All fields' error messages are specific and helpful

### Form Submission
- ✅ Clicking Save calls API with correct payload
- ✅ Only editable fields included in payload
- ✅ isSubmitting state disables Save button during request
- ✅ Success calls onSuccess() callback
- ✅ Success shows success toast
- ✅ Success closes modal

### Role Change Confirmation
- ✅ Role change shows confirmation dialog
- ✅ Confirmation dialog displays old and new role
- ✅ Cancel dismisses dialog, keeps form open
- ✅ Confirm submits form with new role
- ✅ Non-role changes submit immediately (no confirmation)

### Error Handling
- ✅ API errors show as toast (not inline)
- ✅ Backend validation errors (EMAIL_IN_USE, etc.) show proper messages
- ✅ Modal stays open on error
- ✅ SELF_DEMOTION error prevented by API
- ✅ Network error shows generic message

### User Interactions
- ✅ Close button (X) calls onClose()
- ✅ Cancel button calls onClose()
- ✅ Form submission prevented if frontend validation fails
- ✅ Multiple rapid clicks don't trigger multiple submissions

---

## Dependencies & Imports

**UI Components:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
```

**Form & Validation:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userEditSchema, validateUserEditData } from '@/lib/validations/user-edit'
```

**Types & Utils:**
```typescript
import type { UserRole } from '@/types'
import { canEditField, getEditableFields } from '@/lib/permissions/user-editing'
import { SKILL_LEVEL_LABELS, ROLE_LABELS } from '@/lib/constants/labels'
```

**Toast & Async:**
```typescript
import { toast } from 'sonner'
import { useState } from 'react'
```

---

## Success Criteria

✅ Modal renders correctly with user data pre-filled
✅ Field visibility matches permission rules (editable vs read-only)
✅ Frontend validation shows inline errors
✅ Role change shows confirmation dialog
✅ API submission sends correct payload
✅ Errors display as toasts, modal stays open
✅ Success toast + modal closes on successful save
✅ All 15+ tests passing
✅ Component works on mobile and desktop
✅ Accessibility: keyboard navigation, focus management, clear error messages

---

## Files to Create/Modify

**Create:**
- `src/app/dashboard/users/edit-user-modal.tsx` — Modal component
- `src/app/dashboard/users/edit-user-modal.test.ts` — Unit tests

**Modify:**
- None (Task 8 will integrate with users table)

---

## Related Files

- API endpoint: `src/app/api/users/[userId]/route.ts` (already implemented, Task 6)
- Permissions: `src/lib/permissions/user-editing.ts` (already implemented, Task 1-2)
- Validation: `src/lib/validations/user-edit.ts` (already implemented, Task 2)
- Users table: `src/app/dashboard/users/users-client.tsx` (Task 8 will wire modal)

---

## Appendix: Role Change Scenario Examples

### Example 1: Super Admin editing another Super Admin's skill level
- Super Admin can edit skill_level (no confirmation needed)
- Super Admin cannot change another Super Admin's role
- Submit normally, no confirmation dialog

### Example 2: Admin editing a Facilitator's role to Player
- Admin can change Facilitator → Player
- Shows confirmation: "Change John Doe's role from Facilitator to Player?"
- On confirm: API updates, modal closes
- Audit log created (handled by API)

### Example 3: Facilitator viewing a Player's profile
- Facilitator sees all fields (read-only)
- Only skill_level is editable
- No role field visible
- Can only change skill_level

### Example 4: Admin trying to edit their own role to Player
- Admin opens modal to edit self
- Tries to change role from Admin to Player
- Shows confirmation dialog
- On confirm: API returns 400 SELF_DEMOTION error
- Toast shows: "You cannot change your own role"
- Modal stays open, user can continue editing other fields

