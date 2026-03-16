export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage schedules, teams, and player registrations.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📅 Schedule Management</h2>
            <p className="text-gray-600">Create and edit game schedules</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">👥 Registrations</h2>
            <p className="text-gray-600">Review and manage player registrations</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💰 Payments</h2>
            <p className="text-gray-600">Verify payment proofs</p>
          </div>
        </div>
      </div>
    </div>
  )
}
