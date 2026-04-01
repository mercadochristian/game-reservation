'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PlayerInfo } from '@/lib/hooks/useSchedulePlayers'

interface PlayerRosterProps {
  attended: PlayerInfo[]
  pending: PlayerInfo[]
  isLoading: boolean
  error?: string | null
}

function PlayerRow({ player }: { player: PlayerInfo }) {
  const name = player.player ? `${player.player.first_name ?? ''} ${player.player.last_name ?? ''}`.trim() : 'Unknown'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <span className="text-sm font-medium text-foreground truncate">{name || 'Unknown player'}</span>
      <Badge variant="outline" className="ml-2 flex-shrink-0">
        {player.payment_status === 'paid' ? 'Paid' : player.payment_status}
      </Badge>
    </div>
  )
}

export function PlayerRoster({
  attended,
  pending,
  isLoading,
  error,
}: PlayerRosterProps) {
  const totalRegistered = attended.length + pending.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players ({totalRegistered} registered)</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-900">
            Failed to load players: {error}
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : totalRegistered === 0 ? (
          <div className="p-4 bg-muted text-muted-foreground rounded-lg text-sm text-center">
            No registrations for this schedule.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Attended Column */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Attended <span className="text-emerald-600 dark:text-emerald-400">({attended.length})</span>
                </h3>
                {attended.length === 0 ? (
                  <div className="p-3 bg-muted text-muted-foreground rounded-lg text-xs text-center">
                    No attendees yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attended.map((player) => (
                      <PlayerRow key={player.registration_id} player={player} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Column */}
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Pending <span className="text-muted-foreground">({pending.length})</span>
                </h3>
                {pending.length === 0 ? (
                  <div className="p-3 bg-muted text-muted-foreground rounded-lg text-xs text-center">
                    Everyone has checked in!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pending.map((player) => (
                      <PlayerRow key={player.registration_id} player={player} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
