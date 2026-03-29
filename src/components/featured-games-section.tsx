'use client'

import { motion } from 'framer-motion'
import type { ScheduleWithLocation } from '@/types'
import { FeaturedGameCard } from '@/components/featured-game-card'
import { fadeUpVariants } from '@/lib/animations'

interface FeaturedGamesSectionProps {
  schedules: (ScheduleWithLocation & { registrations_count: number })[]
}

export function FeaturedGamesSection({ schedules }: FeaturedGamesSectionProps) {
  // Filter out past games and show only first 3 upcoming games
  const now = new Date()
  const upcomingGames = schedules.filter((schedule) => {
    const gameTime = new Date(schedule.start_time)
    return gameTime > now
  })
  const featuredGames = upcomingGames.slice(0, 3)

  return (
    <section id="schedule" className="py-16 px-4 sm:px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUpVariants}
          className="mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Featured Games
          </h2>
        </motion.div>

        {/* Games grid or empty state */}
        {featuredGames.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {featuredGames.map((game, index) => (
              <motion.div
                key={game.id}
                custom={index}
                variants={fadeUpVariants}
                data-testid="game-card"
              >
                <FeaturedGameCard schedule={game} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              No upcoming games at the moment. Check back soon!
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
