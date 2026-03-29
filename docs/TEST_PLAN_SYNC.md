# Test Plan Sync Process

**Last Updated:** 2026-03-29

This document establishes the workflow for keeping test plans synchronized with feature development.

## Overview

Test plans live in **Notion** (`Game Reservation Tests` database) and serve as the source of truth for what needs to be tested across the application. Whenever a **new feature is implemented**, the test plan must be updated to reflect:
- New test cases for the feature
- Updated test status (Ready, In Progress, Deferred, Blocked)
- Feature tier (Implemented vs Coming Soon)

## Workflow: Adding a New Feature

### When Starting Feature Development

**Before or during implementation:**

1. **Create/update feature entry in Notion**
   - Feature name
   - Tier: `Implemented` (if completing) or `Coming Soon` (if planning)
   - Add test case entries with:
     - Test Case name
     - Type (E2E, Unit, Integration)
     - Priority (P0, P1, P2)
     - Steps
     - Expected Result
     - Status: `In Progress`

2. **Link to implementation**
   - Reference files in `src/app/`, `src/components/`, `src/lib/`
   - Update `docs/CODEBASE.md` with new file locations

### When Feature is Complete

**After implementation is done and tests pass:**

1. **Mark Notion entries as `Ready`**
   - Update Status: `In Progress` → `Ready`
   - Verify all test cases are defined

2. **Update documentation**
   - Add feature details to `docs/CODEBASE.md` (technical)
   - Add feature to `docs/FUNCTIONAL.md` (stakeholder-facing)
   - Update `CLAUDE.md` if architecture changed

3. **Commit changes with feature reference**
   - Include feature name in commit message
   - Example: `feat: implement QR scanner for attendance tracking`

## Feature Status Reference

| Tier | Status | Meaning |
|------|--------|---------|
| Implemented | Ready | Feature built, tested, ready for QA |
| Implemented | In Progress | Feature in active development |
| Implemented | Blocked | Feature development paused, awaiting blocker resolution |
| Coming Soon | Deferred | Feature planned but not yet started |
| Coming Soon | Ready | Design complete, awaiting development start |

## Current Features Status

### ✅ Implemented & Ready

1. **Authentication** — Email/password sign in/sign up
2. **Profile Management** — Create/edit user profiles
3. **Game Schedules** — Full CRUD for admin
4. **Locations** — Full CRUD for admin
5. **Registrations** — Solo/Group/Team registration flows
6. **Payments** — Admin approval and verification
7. **My Registrations** — Player view of registered games
8. **Team Lineups** — Drag-and-drop lineup builder
9. **User Management** — Admin user controls
10. **Activity Logs** — System logging
11. **Registered Games Dashboard** — Location-first game filtering (NEW)
12. **Registration Group Card** — Reusable card component for game sections (NEW)

### 🔄 Coming Soon / In Design

1. **QR Scanner** — Facilitator attendance marking
2. **MVP Awards** — Facilitator voting system
3. **Merged Registrations Dashboard** — Enhanced view (design in progress)

## How to Update Test Plans When Adding Features

### Step 1: Design Phase
Create a feature spec doc in `docs/superpowers/specs/`:
- Feature name
- User stories
- Acceptance criteria
- Tech stack/implementation details

### Step 2: During Implementation
1. Open Notion `Game Reservation Tests` database
2. Add a new row per test case for your feature
3. Fill in: Feature, Test Case, Type, Priority, Steps, Expected Result
4. Set Status: `In Progress`, Tier: `Implemented`

### Step 3: Testing & QA
1. Run tests locally
2. Update Notion Status → `Ready` when tests pass
3. Link test results in Status field if needed

### Step 4: After Merge
1. Update documentation files
2. Close/update any related Notion entries
3. Mark Status → `Ready` if not already

## Test Plan Database Fields

| Field | Type | Purpose |
|-------|------|---------|
| **Name** | Title | Unique test identifier |
| **Feature** | Text | Feature being tested |
| **Test Case** | Text | What is being tested |
| **Type** | Select | E2E, Unit, or Integration test |
| **Priority** | Select | P0 (Critical), P1 (High), P2 (Medium) |
| **Status** | Select | Ready, In Progress, Deferred, Blocked |
| **Tier** | Select | Implemented or Coming Soon |
| **Steps** | Text | How to reproduce the test |
| **Expected Result** | Text | What should happen |

## Notion Database Link

**URL:** https://www.notion.so/33289f8b28e4807c96f9e75cb23a87c3
**Database ID:** `33289f8b28e4807c96f9e75cb23a87c3`

## Integration with Development

### When reviewing code:
- Verify test cases exist in Notion for the feature
- Confirm test status is `Ready` before merge

### When planning sprints:
- Reference Notion database for test coverage gaps
- Prioritize P0 test cases first

### When onboarding new developers:
- Share Notion link
- Walk through completed test cases as examples
- Show how to add new test cases for features

## Quick Checklist for New Features

- [ ] Feature spec created in `docs/superpowers/specs/`
- [ ] Test cases added to Notion database
- [ ] Implementation code written
- [ ] Unit/Integration tests passing
- [ ] Documentation updated (`CODEBASE.md`, `FUNCTIONAL.md`)
- [ ] Notion status set to `Ready`
- [ ] Code reviewed and merged
- [ ] PR/commit linked in Notion if needed

## Questions?

If test plans get out of sync:
1. Check `git log` for recent features added
2. Update Notion entries to match implemented features
3. Ask: "Is this feature in the codebase? If yes, it needs a test plan."

---

**Note:** This process is lightweight by design. The goal is to keep test plans *just in sync* with feature development, not to create bureaucratic overhead. Update Notion when you add features, mark status as Ready when done. That's it.
