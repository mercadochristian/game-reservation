# Supabase Migration Strategy

## Overview

This project uses a consolidated migration approach to support both **existing deployments** and **fresh installations**.

## Files

- **`20250327000000_comprehensive_consolidated.sql`** — Single source of truth containing the complete schema
- Older incremental migrations (2025-03-17 to 2025-03-26) — Preserved for backward compatibility

## For Fresh Deployments

When deploying to a new environment:

1. **Option A (Recommended):** Apply only the comprehensive consolidated migration
   - Supabase will automatically record all prior migrations as "applied"
   - The database will have the same schema as an existing deployment

2. **Option B:** Let Supabase apply migrations in chronological order
   - All migrations will run in sequence
   - Final schema is identical to Option A

Both options result in the same final schema.

## For Existing Deployments

If you already have migrations applied:

1. Continue running migrations in chronological order
2. The comprehensive consolidated migration (`20250327000000_...`) will run last
3. It uses `IF NOT EXISTS` conditions throughout, so:
   - Already-created tables and indexes are skipped
   - New tables and columns are added
   - Triggers, policies, and functions are recreated/updated safely

## Idempotency Guarantees

The comprehensive consolidated migration is fully idempotent:

- **Tables:** Created with `IF NOT EXISTS`
- **Indexes:** Created with `IF NOT EXISTS`
- **Functions:** Created or replaced via `CREATE OR REPLACE`
- **Triggers:** Dropped and recreated (safe because they depend only on functions)
- **Policies:** Dropped and recreated (ensures consistency)
- **Enums:** Created with `IF NOT EXISTS` (adding new values if needed)
- **Storage:** Inserted with `ON CONFLICT ... DO NOTHING`

## What Changed

### New Tables
- `payment_channels` — Payment provider configuration
- `registration_payments` — Payment tracking per registration/team

### New Columns
- `users.is_guest` — Mark stub guest accounts
- `registrations.lineup_team_id` — Team assignment for game-day lineups
- `registrations.payment_channel_id` — Payment method used
- `registrations.extracted_*` — AI-extracted payment data fields
- `schedules.position_prices` — Position-based pricing
- `schedules.team_price` — Team-based pricing
- `teams.team_type` — Discriminate registration vs. lineup teams
- `team_members.registration_id` — Link team assignments to registrations

### Updated Enums
- `user_role` — Added `super_admin`
- `team_preference` — Changed from `(shuffle, teammate)` to `(shuffle, group, team)`

### New Policies
- Payment channels: admin management + player visibility
- Registration payments: player access + admin management

## Backward Compatibility

The consolidated migration maintains compatibility with:

- Existing data in all tables
- Existing RLS policies (dropped and recreated consistently)
- Existing triggers (recreated safely)
- Older application code (functions support both `set_updated_at` and `update_updated_at_column`)

## Future Migrations

For new features after 2025-03-27:

1. Create a new migration file with the next timestamp (e.g., `20250401000000_...`)
2. Add incremental changes (new columns, tables, etc.)
3. Update the comprehensive consolidated migration to include those changes for future fresh deployments

Optionally, periodically consolidate all migrations into a fresh comprehensive file to keep the migration directory lean.
