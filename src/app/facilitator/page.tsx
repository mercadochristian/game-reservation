export default function FacilitatorDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Facilitator Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage attendance and game day operations.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📱 QR Scanner</h2>
            <p className="text-gray-600">Scan player QR codes for attendance</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">👥 Team Management</h2>
            <p className="text-gray-600">View and organize teams</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">⭐ Award MVP</h2>
            <p className="text-gray-600">Recognize outstanding players</p>
          </div>
        </div>
      </div>
    </div>
  )
}
