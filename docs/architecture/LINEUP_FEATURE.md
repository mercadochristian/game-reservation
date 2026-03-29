# Lineup Feature Implementation Tracker

**Status:** In Progress
**Started:** 2026-03-26
**Context:** Building drag-and-drop lineup builder for admins/facilitators to organize registered players into game-day teams

## Todos

### Backend
- [x] Create DB migration: add `team_type` to `teams` and `lineup_team_id` to `registrations`
- [x] Update TypeScript types: add fields to `database.ts`
- [x] Add `RegistrationForLineup` type to `index.ts`
- [x] Create validation schema: `saveLineupSchema` in `lineup.ts`
- [x] Create API route: `POST /api/admin/lineups`
- [x] Update registrations page RSC: fetch lineup data
- [x] Update registrations client: add "Set Lineup" button and team column logic

### Frontend
- [x] Install `@dnd-kit/core` + `@dnd-kit/utilities`
- [ ] Create lineup server component: `page.tsx` with role check and data fetching
- [ ] Create lineup loading skeleton: `loading.tsx`
- [ ] Create lineup client component: `lineup-client.tsx` with full DnD UI
  - [ ] State model: `DraggableUnit` and `LineupState`
  - [ ] Initialization: build units from registrations, handle existing lineup
  - [ ] Sub-components: `<UnassignedPool>`, `<TeamColumn>`, `<DraggableUnitCard>`, `<LineupToolbar>`
  - [ ] DnD implementation: setup `@dnd-kit` with droppable containers and draggables
  - [ ] Save handler: POST to `/api/admin/lineups`, refresh page

### Infrastructure
- [ ] Update `src/middleware.ts`: add `SHARED_PATHS` for facilitator access to `/admin/lineups`
- [ ] Update `docs/CODEBASE.md`: add database schema, API route, pages, types, validation
- [ ] Update `docs/FUNCTIONAL.md`: add plain-language description of lineup feature

### Testing (Manual)
- [ ] Verify "Set Lineup" button appears in registrations page when schedule selected
- [ ] Navigate to `/admin/lineups/[scheduleId]` as admin
- [ ] Verify N team columns load based on `schedule.num_teams`
- [ ] Verify unassigned pool shows all players (solo and grouped)
- [ ] Verify solo players can be dragged to teams individually
- [ ] Verify group registrations drag together as one unit
- [ ] Verify team names can be edited inline
- [ ] Verify Save button creates lineup teams and updates registrations
- [ ] Verify registrations page Team column shows lineup team names after save
- [ ] Verify facilitator can access `/admin/lineups/[scheduleId]` without redirect
- [ ] Run `npm run build` — no TypeScript errors

## Notes

- Groups/teams identified by shared `team_members.team_id` from registration time
- Lineup teams are NEW `teams` records with `team_type = 'lineup'` (distinct from registration teams)
- Groups move atomically — all players in a group drag together as one `DraggableUnit`
- Existing lineup teams loaded from DB; if none exist, create N empty placeholders at initialization
- Save deletes old lineup teams and creates new ones (wholesale replacement approach)

## Delete This Document When Complete

Once all todos are done, delete this file: `rm docs/LINEUP_FEATURE.md`
