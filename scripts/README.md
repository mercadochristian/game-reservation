# Scripts — Volleyball Reservation App

## Seeding Test Data

### Option 1: TypeScript Script (Recommended) ⭐

Creates auth users + complete player profiles automatically.

```bash
npx ts-node scripts/seed-players.ts
```

**What it does:**
- Creates 6 test player auth users
- Automatically populates public.users with complete profiles
- All players are ready to register for games immediately
- Idempotent: safe to run multiple times (skips existing users)

**Requirements:**
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set

**Test Players Created:**
- `player1@test.local` — Alice Johnson (Intermediate)
- `player2@test.local` — Bob Smith (Intermediate+)
- `player3@test.local` — Carol Williams (Advanced)
- `player4@test.local` — David Brown (Developmental+)
- `player5@test.local` — Emma Davis (Intermediate)
- `player6@test.local` — Frank Miller (Developmental)

---

### Option 2: SQL Script (Manual)

For direct database insertion via Supabase SQL Editor.

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Create 6 auth users via Auth > Users > Add User (note their UUIDs)
3. Paste `scripts/seed-players.sql` into SQL Editor
4. Replace UUID placeholders with real UUIDs
5. Execute

---

## Reset Data

Clear all application data (keep schema):

```bash
psql <connection-string> -f scripts/reset-data.sql
```

Or paste `scripts/reset-data.sql` into Supabase SQL Editor.

**Note:** Auth users are NOT deleted (preserved for re-seeding).

---

## Adding More Test Players

Edit `scripts/seed-players.ts` and add entries to `DUMMY_PLAYERS`:

```ts
{
  email: 'playerN@test.local',
  first_name: 'Name',
  last_name: 'Surname',
  skill_level: 'intermediate',
  gender: 'Male' | 'Female',
  birthday_month: 1-12,
  birthday_day: 1-31,
  birthday_year: 1900-2030,
  player_contact_number: '555-XXXX',
  emergency_contact_name: '...',
  emergency_contact_relationship: '...',
  emergency_contact_number: '...',
}
```

Then re-run: `npx ts-node scripts/seed-players.ts`
