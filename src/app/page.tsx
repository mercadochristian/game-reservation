import { Suspense } from 'react'
import { type ScheduleWithLocation } from '@/types'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicNav } from '@/components/public-nav'
import { PublicCalendar } from '@/components/public-calendar'
import { HeroSection } from '@/components/hero-section'
import { FeaturedGamesSection } from '@/components/featured-games-section'
import { Footer } from '@/components/footer'

async function getSchedules(): Promise<(ScheduleWithLocation & { registrations_count: number; position_counts: Record<string, number> })[]> {
  const supabase = createServiceClient()

  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      *,
      locations(id, name, address, google_map_url),
      registrations(id, position_key)
    `)
    .in('status', ['open', 'full', 'completed'])
    .order('start_time', { ascending: true })

  if (!schedules) return []

  // Map schedules with registration counts and position counts
  return (schedules as any[]).map((schedule) => {
    const registrations = schedule.registrations ?? []
    const positionCounts: Record<string, number> = {}

    registrations.forEach((reg: any) => {
      if (reg.position_key) {
        positionCounts[reg.position_key] = (positionCounts[reg.position_key] ?? 0) + 1
      }
    })

    return {
      ...schedule,
      registrations_count: registrations.length,
      position_counts: positionCounts,
    }
  })
}

function CalendarLoading() {
  return (
    <div className="pt-8 px-4 max-w-4xl mx-auto">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default async function Home() {
  const schedules = await getSchedules()

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <HeroSection />
      <div className="h-px max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
      <FeaturedGamesSection schedules={schedules} />
      <div className="h-px max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
      <Suspense fallback={<CalendarLoading />}>
        <PublicCalendar schedules={schedules} />
      </Suspense>
      <Footer />
    </div>
  )
}
