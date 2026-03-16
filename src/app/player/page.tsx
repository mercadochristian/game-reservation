export default function PlayerDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Player Dashboard</h1>
        <p className="text-gray-600 mb-8">Register for games and manage your profile.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Register for Game</h2>
            <p className="text-gray-600">Sign up for upcoming games</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 My Registrations</h2>
            <p className="text-gray-600">View your upcoming games</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">⭐ My Profile</h2>
            <p className="text-gray-600">Update your skill level and info</p>
          </div>
        </div>
      </div>
    </div>
  )
}
