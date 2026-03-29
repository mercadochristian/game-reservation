import { Suspense } from 'react'
import { type ScheduleWithLocation } from '@/types'
import { createServiceClient } from '@/lib/supabase/service'
import { getNowInManila } from '@/lib/utils/timezone'
import { PublicNav } from '@/components/public-nav'
import { PublicCalendar } from '@/components/public-calendar'
import { HeroSection } from '@/components/hero-section'

async function getSchedules(): Promise<ScheduleWithLocation[]> {
  const supabase = createServiceClient()

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*, locations(id, name, address, google_map_url)')
    .in('status', ['open', 'full', 'completed'])
    .order('start_time', { ascending: true })

  return (schedules ?? []) as ScheduleWithLocation[]
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

  // Compute hero stats from schedules
  const now = getNowInManila()
  const gamesThisMonth = schedules.filter((s) => {
    const d = new Date(s.start_time)
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    )
  }).length

  const uniqueLocations = new Set(
    schedules.map((s) => s.locations?.name).filter(Boolean)
  ).size

  const upcomingCount = schedules.filter(
    (s) => new Date(s.start_time) > now
  ).length

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <HeroSection
        gamesThisMonth={gamesThisMonth}
        uniqueLocations={uniqueLocations}
        upcomingCount={upcomingCount}
      />
      <div className="h-px max-w-4xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />
      </div>
      <Suspense fallback={<CalendarLoading />}>
        <PublicCalendar schedules={schedules} />
      </Suspense>
    </div>
  )
}
