export default function AdminDashboard() {
  return (
    <div className="dark min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage schedules, teams, and player registrations.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">📅 Schedule Management</h2>
            <p className="text-muted-foreground">Create and edit game schedules</p>
          </div>
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">👥 Registrations</h2>
            <p className="text-muted-foreground">Review and manage player registrations</p>
          </div>
          <div className="bg-card border-border border rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">💰 Payments</h2>
            <p className="text-muted-foreground">Verify payment proofs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
