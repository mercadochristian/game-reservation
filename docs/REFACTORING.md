# Refactoring Progress

## Overview
Systematic extraction of reusable functionalities, standardization of Supabase clients, and simplification of repeated patterns across the codebase.

**Status**: Planning complete ✅ — Ready for execution
**Plan Document**: `/Users/christianmercado/.claude/plans/nifty-dancing-canyon.md`

## Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Supabase client standardization | [ ] |
| 2 | Extract guest user utility | [ ] |
| 3 | Adopt useSupabaseQuery in admin pages | [ ] |
| 4 | Extract shared UI components | [ ] |
| 5 | Extract CRUD + pagination hooks | [ ] |
| 6 | Bug fix + coverage gaps | [ ] |

## Implementation Notes

### Phase 1 — Supabase Client Standardization
- [ ] Replace inline `createServerClient` in `api/users/search/route.ts`
- [ ] Update `api/users/search/__tests__/route.test.ts`
- [ ] Verify tests pass

### Phase 2 — Extract Guest User Creation Utility
- [ ] Create `src/lib/services/guest-user.ts`
- [ ] Create `src/lib/services/__tests__/guest-user.test.ts`
- [ ] Update `api/admin/register/route.ts`
- [ ] Update `api/register/group/route.ts`
- [ ] Verify tests pass

### Phase 3 — Adopt useSupabaseQuery in Admin Pages
- [ ] Create `src/lib/hooks/__tests__/useSupabaseQuery.test.ts`
- [ ] Update `admin/locations/page.tsx`
- [ ] Update `admin/schedules/page.tsx`
- [ ] Update `admin/registrations/page.tsx`
- [ ] Update `admin/logs/page.tsx`
- [ ] Verify tests pass

### Phase 4 — Extract Shared UI Components
- [ ] Create `src/components/ui/page-header.tsx`
- [ ] Create `src/components/ui/table-skeleton.tsx`
- [ ] Create `src/components/confirm-delete-dialog.tsx`
- [ ] Create `src/components/filter-accordion.tsx`
- [ ] Update admin pages to use new components
- [ ] Visual verification

### Phase 5 — Extract CRUD and Pagination Hooks
- [ ] Create `src/lib/hooks/useCrudDialog.ts`
- [ ] Create `src/lib/hooks/__tests__/useCrudDialog.test.ts`
- [ ] Create `src/lib/hooks/usePagination.ts`
- [ ] Create `src/lib/hooks/__tests__/usePagination.test.ts`
- [ ] Update `admin/locations/page.tsx`
- [ ] Update `admin/schedules/page.tsx`
- [ ] Update `admin/registrations/page.tsx`
- [ ] Verify tests pass

### Phase 6 — Bug Fix + Coverage Gaps
- [ ] Fix `slideInVariants` bug in `src/lib/animations.ts`
- [ ] Create `src/app/api/admin/register/__tests__/route.test.ts`
- [ ] Create `src/app/api/register/group/__tests__/route.test.ts`
- [ ] Update `vitest.config.mts` coverage include list
- [ ] Verify tests pass with 90% coverage threshold

## Testing & Verification

After each phase, run:
```bash
npm run build    # TypeScript check
npm run lint     # ESLint
npm test         # All tests + coverage
```

All tests must pass and coverage thresholds maintained:
- Lines: 90%
- Functions: 90%
- Branches: 85%
