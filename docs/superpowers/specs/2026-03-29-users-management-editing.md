# Users Management with Edit Modal — Design Specification

**Date:** 2026-03-29
**Feature:** User details, role, and skill level editing with role-based permissions
**Status:** Design Approved

---

## Overview

Add editing capabilities to the existing users management page at `/dashboard/users`. Users with appropriate permissions can edit user details (name, email, contact info), roles (with restrictions), and skill levels through a modal interface. All changes are logged, and role changes require confirmation.

**Key Constraint:** Facilitators can only edit skill level; admins cannot edit other admins or super admins; super admins have full access.

---

## Route Access Control

**Protected Route:** `/dashboard/users`

- **Allowed roles:** `super_admin`, `admin`, `facilitator`
- **Enforcement:** Middleware (`src/middleware.ts`) checks user role before granting access
- **Redirect:** Players are redirected to `/dashboard` if they attempt direct access

---

## Users Table with Edit Button

**Location:** `src/app/dashboard/users/users-client.tsx` (update existing)

**Edit Button Visibility:**
| User Role | Can See Edit Button | Visible For |
|-----------|-------------------|-------------|
| super_admin | Yes | All user rows |
| admin | Yes | Only player and facilitator rows |
| facilitator | No | N/A (skill level editing handled separately) |

**Behavior:** Clicking "Edit" opens the Edit User Modal with userId passed as prop.

---

## Edit User Modal

**Location:** New component `src/app/dashboard/users/edit-user-modal.tsx`

**Header:** "Edit User — [First Name Last Name]"

**Modal Sections & Conditional Visibility:**

### **For Super Admin (editing any user):**
1. **Personal Info Section**
   - First Name (text input, required)
   - Last Name (text input, required)
   - Email (email input, required, must be unique)

2. **Contact Info Section**
   - Phone Number (text input, optional)
   - Emergency Contact Name (text input, optional)
   - Emergency Contact Relationship (text input, optional)
   - Emergency Contact Number (text input, optional)

3. **Role Section**
   - Role (dropdown with all 4 options: [Admin, Player, Facilitator, Super Admin], required)
   - On change: Trigger confirmation dialog if role differs from current

4. **Skill Level Section**
   - Skill Level (dropdown with [None, Developmental, Developmental+, Intermediate, Intermediate+, Advanced], optional)

### **For Admin (editing player/facilitator only):**
1. **Personal Info Section** (same as super admin)
2. **Contact Info Section** (same as super admin)
3. **Role Section**
   - Role (dropdown with [Player, Facilitator] only, required)
   - On change: Trigger confirmation dialog if role differs from current
4. **Skill Level Section** (same as super admin)

### **For Facilitator (any user):**
1. **Skill Level Section Only**
   - Skill Level (dropdown with [None, Developmental, Developmental+, Intermediate, Intermediate+, Advanced], optional)
   - All other fields hidden/disabled

---

## Modal Interactions & Save Flow

**Validation:**

1. **Client-side (form-level):**
   - Email format validation
   - Email uniqueness (optional: client-side check before submit)
   - Required field checks (first_name, last_name, email if visible, role if visible)
   - Show error messages per field

2. **Server-side (API route):**
   - Permission check: User making request can edit each field
   - Email uniqueness check
   - Role assignment validation (user can only assign allowed roles)
   - Self-demotion prevention: Cannot change own role to remove admin privileges
   - Audit log creation if role changed

**Save Process:**

1. User makes changes and clicks "Save" button
2. Client-side validation runs
3. If validation passes and role was changed:
   - Show confirmation dialog: "Change role from [Old] to [New]?"
   - Only proceed if user confirms
4. POST to `/api/users/[userId]` with request body (see API section)
5. On success:
   - Close modal
   - Refresh users table
   - Show success toast: "User updated successfully"
6. On error:
   - Show error toast with user-friendly message
   - Keep modal open, allow retry

**Cancel:** Click "Cancel" button to close without saving.

---

## Confirmation Dialog (Role Changes Only)

**Trigger:** When role value changes from its initial value and user clicks "Save"

**Content:**
```
Title: "Confirm Role Change"
Message: "Change role from [Old Role] to [New Role]?"
Buttons: [Confirm] [Cancel]
```

**Special Cases:**
- If user is editing themselves and trying to remove admin role: Show error "You cannot remove your own admin role" — disable confirmation, block save
- Example: Super Admin editing themselves from Super Admin to Player — blocked
- Example: Admin editing themselves from Admin to Player — blocked

---

## API Endpoint

**Route:** `POST /api/users/[userId]`
**Location:** `src/app/api/users/[userId]/route.ts` (new)

**Request Headers:**
- `Authorization: Bearer <token>` (auto-included by Supabase client)

**Request Body:**
```json
{
  "first_name": "string (optional)",
  "last_name": "string (optional)",
  "email": "string (optional)",
  "player_contact_number": "string (optional)",
  "emergency_contact_name": "string (optional)",
  "emergency_contact_relationship": "string (optional)",
  "emergency_contact_number": "string (optional)",
  "role": "admin | player | facilitator | super_admin (optional)",
  "skill_level": "developmental | developmental_plus | intermediate | intermediate_plus | advanced | null (optional)"
}
```

**Response (Success 200):**
```json
{
  "id": "user_id",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "role": "string",
  "skill_level": "string",
  "player_contact_number": "string",
  "emergency_contact_name": "string",
  "emergency_contact_relationship": "string",
  "emergency_contact_number": "string",
  "updated_at": "ISO timestamp"
}
```

**Response (Error):**
```json
{
  "error": "error_code",
  "message": "User-friendly error message"
}
```

**Error Codes & Messages:**
| Code | Status | Message | Scenario |
|------|--------|---------|----------|
| `PERMISSION_DENIED` | 403 | "You don't have permission to edit this field" | User role can't edit field |
| `INVALID_ROLE` | 400 | "You cannot assign this role" | User can't assign that role |
| `EMAIL_IN_USE` | 400 | "Email is already in use" | Email already exists |
| `SELF_DEMOTION` | 400 | "You cannot remove your own admin role" | Self-demotion attempt |
| `NOT_FOUND` | 404 | "User not found" | User doesn't exist |
| `INVALID_INPUT` | 400 | "Invalid input: [field details]" | Validation failed |
| `SERVER_ERROR` | 500 | "An error occurred while updating user" | DB or internal error |

**Server-side Logic:**
1. Extract user ID from URL and current user from auth session
2. Fetch current user record (for role verification and audit comparison)
3. Fetch target user record (to edit)
4. For each field in request body:
   - Check if current user's role permits editing that field
   - If not permitted, return 403 PERMISSION_DENIED
5. If role is being changed:
   - Verify current user can assign that role
   - Check if target user is trying to demote themselves
   - If yes, return 400 SELF_DEMOTION
6. Validate email uniqueness (if email field present)
7. Update user record in database
8. If role was changed:
   - Create audit log entry: `{ user_id, changed_by, old_role, new_role, timestamp }`
9. Return updated user data (200)

---

## Audit Logging

**Table:** `logs` (existing table)

**Schema:** The existing `logs` table structure:
- `id` (UUID)
- `level` ('info' | 'warn' | 'error')
- `action` (string) — e.g., "role_change"
- `user_id` (UUID or null) — target user being changed
- `message` (string or null)
- `metadata` (JSON) — flexible storage for change details
- `created_at` (timestamp)

**Entry Structure:** Created only when role changes occur. Example:
```json
{
  "level": "info",
  "action": "role_change",
  "user_id": "[target_user_id]",
  "message": "Role changed from admin to facilitator",
  "metadata": {
    "changed_by": "[current_user_id]",
    "old_role": "admin",
    "new_role": "facilitator"
  },
  "created_at": "[timestamp]"
}
```

---

## Error Handling

**Client-side (Modal):**
- **Validation errors:** Display per-field error messages below each field
- **Confirmation rejection:** Close confirmation dialog, keep modal open
- **Network errors:** Show error toast and retry button
- **Permission errors:** Show error toast: "[Field Name] cannot be edited by your role"

**Server-side (API):**
- Always return appropriate HTTP status code (400, 403, 404, 500)
- Never expose stack traces or internal DB errors in response
- Log internal errors with request ID for debugging
- Return user-friendly error message in response

**Retry Strategy:**
- Network failures: Show "Retry" option in toast
- Transient errors (DB locks): Retry with exponential backoff (max 3 attempts)
- Validation/permission errors: No retry, show error only

---

## Components & Files

**Files to Create:**
1. `src/app/dashboard/users/edit-user-modal.tsx` — Modal component with form
2. `src/app/api/users/[userId]/route.ts` — API endpoint

**Files to Update:**
1. `src/app/dashboard/users/users-client.tsx` — Add edit button, modal state
2. `src/middleware.ts` — Ensure role-based access to `/dashboard/users` (if not already)

**Database:** No migrations needed (uses existing `logs` table)

---

## Testing Strategy

**Unit Tests:**
- Permission logic: Test that each role can/cannot edit specific fields
- Validation: Email format, required fields, uniqueness
- Role assignment: Verify which roles can assign which roles
- Self-demotion prevention: Verify users can't demote themselves

**Integration Tests:**
- API endpoint: Valid role change, invalid role assignment, permission denial
- Audit logging: Verify role changes are logged correctly
- Email uniqueness: Test duplicate email rejection

**E2E Scenarios:**
1. Super Admin edits player details and role → success
2. Admin edits player details → success
3. Admin tries to edit another admin → edit button hidden
4. Facilitator views user → only skill level visible
5. User tries to demote themselves → error
6. Role change triggers confirmation dialog
7. Network error during save → shows retry option

---

## Dark Mode & Accessibility

- Modal uses existing design tokens for dark mode (already configured in project)
- Form fields use existing input/select components from `/src/components/ui/`
- Focus indicators on all interactive elements
- Error messages have sufficient contrast
- Confirmation dialog is keyboard-accessible

---

## Future Considerations (Out of Scope)

- Bulk editing multiple users
- User deactivation/deletion
- Password reset flow
- Email verification on email change
- Two-factor authentication for sensitive operations

