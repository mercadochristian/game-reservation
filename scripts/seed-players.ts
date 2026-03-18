/**
 * Seed Script — Create dummy player data for testing
 *
 * Usage:
 *   node --loader ts-node/esm --no-warnings scripts/seed-players.ts
 *   OR: npx tsx scripts/seed-players.ts
 *
 * This script creates multiple test players with complete profiles.
 * Auth users are created directly, and public.users entries are populated.
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DUMMY_PLAYERS = [
  {
    email: 'player1@test.local',
    first_name: 'Alice',
    last_name: 'Johnson',
    skill_level: 'intermediate' as const,
    gender: 'Female',
    birthday_month: 3,
    birthday_day: 15,
    birthday_year: 1995,
    player_contact_number: '555-0101',
    emergency_contact_name: 'John Johnson',
    emergency_contact_relationship: 'Brother',
    emergency_contact_number: '555-0100',
  },
  {
    email: 'player2@test.local',
    first_name: 'Bob',
    last_name: 'Smith',
    skill_level: 'intermediate_plus' as const,
    gender: 'Male',
    birthday_month: 7,
    birthday_day: 22,
    birthday_year: 1992,
    player_contact_number: '555-0102',
    emergency_contact_name: 'Sarah Smith',
    emergency_contact_relationship: 'Sister',
    emergency_contact_number: '555-0103',
  },
  {
    email: 'player3@test.local',
    first_name: 'Carol',
    last_name: 'Williams',
    skill_level: 'advanced' as const,
    gender: 'Female',
    birthday_month: 11,
    birthday_day: 8,
    birthday_year: 1990,
    player_contact_number: '555-0104',
    emergency_contact_name: 'Mike Williams',
    emergency_contact_relationship: 'Spouse',
    emergency_contact_number: '555-0105',
  },
  {
    email: 'player4@test.local',
    first_name: 'David',
    last_name: 'Brown',
    skill_level: 'developmental_plus' as const,
    gender: 'Male',
    birthday_month: 1,
    birthday_day: 30,
    birthday_year: 1998,
    player_contact_number: '555-0106',
    emergency_contact_name: 'Lisa Brown',
    emergency_contact_relationship: 'Mother',
    emergency_contact_number: '555-0107',
  },
  {
    email: 'player5@test.local',
    first_name: 'Emma',
    last_name: 'Davis',
    skill_level: 'intermediate' as const,
    gender: 'Female',
    birthday_month: 5,
    birthday_day: 12,
    birthday_year: 1996,
    player_contact_number: '555-0108',
    emergency_contact_name: 'Tom Davis',
    emergency_contact_relationship: 'Father',
    emergency_contact_number: '555-0109',
  },
  {
    email: 'player6@test.local',
    first_name: 'Frank',
    last_name: 'Miller',
    skill_level: 'developmental' as const,
    gender: 'Male',
    birthday_month: 9,
    birthday_day: 5,
    birthday_year: 1999,
    player_contact_number: '555-0110',
    emergency_contact_name: 'Nancy Miller',
    emergency_contact_relationship: 'Aunt',
    emergency_contact_number: '555-0111',
  },
]

async function seedPlayers() {
  console.log('🌱 Starting player seeding...\n')

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const player of DUMMY_PLAYERS) {
    try {
      console.log(`Creating ${player.first_name} ${player.last_name} (${player.email})...`)

      // Step 1: Create auth user via admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: player.email,
        password: Math.random().toString(36).slice(-12), // random password, they'll use magic link
        email_confirm: true, // auto-confirm email
      })

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.log(`  ⏭️  Already exists, skipping...\n`)
          skipCount++
          continue
        }
        throw authError
      }

      if (!authUser.user?.id) {
        throw new Error('No user ID returned from auth creation')
      }

      // Step 2: Insert/update public.users with complete profile
      const userData: Record<string, any> = {
        id: authUser.user.id,
        email: player.email,
        role: 'player',
        first_name: player.first_name,
        last_name: player.last_name,
        skill_level: player.skill_level,
        gender: player.gender,
        birthday_month: player.birthday_month,
        birthday_day: player.birthday_day,
        birthday_year: player.birthday_year,
        player_contact_number: player.player_contact_number,
        emergency_contact_name: player.emergency_contact_name,
        emergency_contact_relationship: player.emergency_contact_relationship,
        emergency_contact_number: player.emergency_contact_number,
        profile_completed: true,
      }

      const { error: dbError } = (await supabase
        .from('users')
        .upsert([userData])) as any

      if (dbError) throw dbError

      console.log(`  ✅ Created successfully\n`)
      successCount++
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}\n`)
      errorCount++
    }
  }

  console.log('\n📊 Seeding Summary')
  console.log(`  ✅ Created: ${successCount}`)
  console.log(`  ⏭️  Skipped: ${skipCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log(`\n✨ All test players have complete profiles and can be used immediately!`)
}

seedPlayers().catch((error: any) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
