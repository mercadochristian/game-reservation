export default function PlayerDashboard() {
  return (
    <div className="dark min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-2">Player Dashboard</h1>
        <p className="text-muted-foreground mb-8">Register for games and manage your profile.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">📋 Register for Game</h2>
            <p className="text-muted-foreground">Sign up for upcoming games</p>
          </div>
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">📊 My Registrations</h2>
            <p className="text-muted-foreground">View your upcoming games</p>
          </div>
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">⭐ My Profile</h2>
            <p className="text-muted-foreground">Update your skill level and info</p>
          </div>
        </div>
      </div>
    </div>
  )
}
